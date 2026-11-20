import {defineConfig,devices} from '@playwright/test';
const baseURL=process.env.QA_BASE_URL||'http://127.0.0.1:3109';
const launchOptions=process.env.QA_CHROME_EXECUTABLE?{executablePath:process.env.QA_CHROME_EXECUTABLE}:{};
const {QA_SUPABASE_SERVICE_ROLE_KEY:omittedSecret,...safeServerEnv}=process.env;
void omittedSecret;
export default defineConfig({
 testDir:'./tests/e2e',
 testMatch:'**/*.spec.mjs',
 timeout:60000,
 expect:{timeout:15000},
 fullyParallel:false,
 workers:1,
 retries:0,
 reporter:[['list']],
 outputDir:'./test-results/e2e',
 use:{...devices['Desktop Chrome'],baseURL,trace:'off',screenshot:'off',launchOptions},
 webServer:process.env.QA_BASE_URL?undefined:{
  command:'npm run dev -- --hostname 127.0.0.1 --port 3109',
  url:baseURL+'/api/health',
  reuseExistingServer:false,
  timeout:180000,
  env:{...safeServerEnv,NEXT_PUBLIC_SITE_URL:baseURL}
 }
});
