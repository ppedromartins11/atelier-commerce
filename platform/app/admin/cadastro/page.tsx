import Link from 'next/link';
import {registerAccount} from '@/app/admin/onboarding-actions';
export const dynamic='force-dynamic';
export default async function Register({searchParams}:{searchParams:Promise<{erro?:string;status?:string}>}){
 const q=await searchParams;
 const ready=Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
 return <main className="shell login-wrap"><span className="eyebrow">CRIE SUA CONTA</span>
  <h1>Sua loja começa aqui.</h1>
  <p className="help-text">Depois de confirmar seu e-mail, você poderá cadastrar uma ou mais empresas e administrar cada uma separadamente.</p>
  {!ready&&<p className="notice">O cadastro será liberado após a conexão do banco de dados dedicado.</p>}
  {q.erro&&<p className="alert">{q.erro}</p>}
  {q.status==='confirmar'&&<p className="notice">Conta registrada. Confira seu e-mail e confirme o cadastro antes de acessar o painel.</p>}
  <div className="panel"><form action={registerAccount}>
    <label className="field">E-mail profissional<input name="email" required type="email" maxLength={254} autoComplete="email" placeholder="voce@suaempresa.com.br"/></label>
    <label className="field">Senha (mínimo 12 caracteres)<input name="password" required type="password" minLength={12} maxLength={72} autoComplete="new-password"/></label>
    <button className="btn btn-dark full" type="submit" disabled={!ready}>Criar minha conta</button>
  </form></div>
  <p className="help-text">Já tem cadastro? <Link className="text-link" href="/admin/login">Entrar</Link>.</p>
 </main>;
}
