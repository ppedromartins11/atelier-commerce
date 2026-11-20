// Anonymous browser smoke without credentials. Requires Chrome/Chromium.
import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {existsSync,readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {setTimeout as delay} from 'node:timers/promises';
const port=3107,base='http://127.0.0.1:'+port;
const browser=['google-chrome','google-chrome-stable','chromium','chromium-browser'].find(n=>spawnSync('which',[n],{stdio:'ignore'}).status===0);
assert.ok(browser,'Chrome/Chromium required');
let logs='';
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--port',String(port)],{
  env:{...process.env,NEXT_PUBLIC_SUPABASE_URL:'',NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'',NEXT_PUBLIC_SITE_URL:base},
  stdio:['ignore','pipe','pipe']
});
for(const stream of [server.stdout,server.stderr])stream.on('data',b=>{logs+=String(b).slice(0,3000)});
const dir=mkdtempSync(join(tmpdir(),'atelier-browser-'));
let chrome=null,socket=null;
const fetchRoute=path=>fetch(base+path,{redirect:'manual',signal:AbortSignal.timeout(10000)});
try{
 let ready=false;
 for(let i=0;i<80;i++){
   if(server.exitCode!==null)throw new Error('Next.js exited: '+logs);
   try {if((await fetchRoute('/api/health')).ok){ready=true;break}}catch{}
   await delay(250);
 }
 assert.ok(ready,'Next.js did not start: '+logs);
 const health=await (await fetchRoute('/api/health')).json();
 assert.equal(health.status,'setup_required');
 for(const route of ['/','/catalogo','/carrinho','/admin/login','/admin/cadastro']){
   const res=await fetchRoute(route);
   assert.equal(res.status,200,route+' HTTP status');
   console.log('HTTP OK',route);
 }
 for(const route of ['/admin','/admin/produtos','/admin/estoque','/admin/equipe','/admin/dominios','/admin/lojas/nova']){
   const res=await fetchRoute(route);
   assert.ok([302,303,307,308].includes(res.status),route+' should redirect');
   assert.match(res.headers.get('location')||'',/\/admin\/login/);
   console.log('AUTH GUARD OK',route);
 }
 assert.equal((await fetchRoute('/loja/qa-inexistente')).status,404);
 assert.equal((await fetchRoute('/api/catalog-image/bad-id?index=0')).status,400);
 assert.equal((await fetchRoute('/api/catalog-image/11111111-1111-4111-8111-111111111111?index=9')).status,400);
 const confirm=await fetchRoute('/auth/confirm');
 assert.ok([302,303,307,308].includes(confirm.status));
 assert.match(confirm.headers.get('location')||'',/\/admin\/login/);
 console.log('HTTP OK unknown store, invalid image and confirmation');

 chrome=spawn(browser,['--headless=new','--no-sandbox','--disable-gpu','--disable-dev-shm-usage',
  '--disable-background-networking','--no-first-run','--remote-allow-origins=*',
  '--remote-debugging-port=0','--user-data-dir='+dir,'about:blank'],{stdio:'ignore'});
 let debugPort=0;
 for(let i=0;i<120;i++){
   const file=join(dir,'DevToolsActivePort');
   if(existsSync(file)){debugPort=Number(readFileSync(file,'utf8').split('\n')[0]);break}
   if(chrome.exitCode!==null)throw new Error('Chrome exited');
   await delay(100);
 }
 assert.ok(debugPort,'Chrome DevTools unavailable');
 const targets=await (await fetch('http://127.0.0.1:'+debugPort+'/json')).json();
 const target=targets.find(t=>t.type==='page');
 assert.ok(target?.webSocketDebuggerUrl,'Missing browser page target');
 socket=new WebSocket(target.webSocketDebuggerUrl);
 await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject});
 let id=0;const pending=new Map();
 socket.onmessage=event=>{
   const obj=JSON.parse(event.data);
   if(obj.id&&pending.has(obj.id)){pending.get(obj.id)(obj);pending.delete(obj.id)}
 };
 const cdp=(method,params={})=>new Promise((resolve,reject)=>{
   const n=++id;
   pending.set(n,reply=>reply.error?reject(new Error(JSON.stringify(reply.error))):resolve(reply.result));
   socket.send(JSON.stringify({id:n,method,params}));
 });
 await cdp('Page.enable');await cdp('Runtime.enable');
 const evaluate=async expression=>{
   const r=await cdp('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
   if(r.exceptionDetails)throw new Error(JSON.stringify(r.exceptionDetails));
   return r.result.value;
 };
 const visit=async(route,expected,width=1280,height=900)=>{
   await cdp('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<700});
   await cdp('Page.navigate',{url:base+route});
   let state;
   for(let i=0;i<65;i++){
     await delay(140);
     state=await evaluate('({text:document.body?.innerText||"",ready:document.readyState,scroll:document.documentElement.scrollWidth,width:window.innerWidth})');
     if(state.text.includes(expected)&&state.ready==='complete')break;
   }
   assert.ok(state.text.includes(expected),route+' missing '+expected);
   assert.ok(state.scroll<=state.width+2,route+' horizontal overflow '+state.scroll+'>'+state.width);
   console.log('BROWSER OK',route,width+'px');
 };
 await visit('/','ATELIER',1280);
 await visit('/','ATELIER',390,844);
 await delay(1100);
 await evaluate("document.querySelector('.store-menu-trigger')?.click()");
 let expanded=false;
 for(let i=0;i<20;i++){
   await delay(150);
   expanded=(await evaluate("document.querySelector('.store-menu-trigger')?.getAttribute('aria-expanded')"))==='true';
   if(expanded)break;
 }
 assert.ok(expanded,'Mobile menu failed to open');
 assert.equal(await evaluate("document.querySelector('#store-mobile-nav')?.classList.contains('is-open')"),true);
 await visit('/catalogo','Explore a coleção',390,844);
 await visit('/carrinho','Carrinho',390,844);
 await visit('/admin/login','Gerencie sua loja.',390,844);
 assert.equal(await evaluate("document.querySelector('button[type=submit]')?.disabled"),true);
 await visit('/admin/cadastro','Sua loja começa aqui.',390,844);
 assert.equal(await evaluate("document.querySelector('button[type=submit]')?.disabled"),true);
 console.log('PASS: anonymous UI navigation, mobile menu, no horizontal scrolling, auth guards and setup forms');
}finally{
 if(socket)socket.close();
 if(chrome){chrome.kill('SIGTERM');await delay(250)}
 server.kill('SIGTERM');
 rmSync(dir,{recursive:true,force:true});
}
