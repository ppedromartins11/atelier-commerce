import {NextResponse,type NextRequest} from 'next/server';
import {sessionClient} from '@/lib/supabase';
export async function GET(request:NextRequest) {
 const url=new URL(request.url);
 const token=url.searchParams.get('token_hash')||'';
 const suppliedType=url.searchParams.get('type');
 if(!token || !['email','signup','invite'].includes(suppliedType||''))
   return NextResponse.redirect(new URL('/admin/login?erro=confirmacao',url));
 const db=await sessionClient();
 if(!db)return NextResponse.redirect(new URL('/admin/login?erro=config',url));
 const {error}=await db.auth.verifyOtp({token_hash:token,type:suppliedType as 'email'|'signup'|'invite'});
 return NextResponse.redirect(new URL(error?'/admin/login?erro=confirmacao':'/admin/login?confirmado=1',url));
}
