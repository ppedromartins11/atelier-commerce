import Link from 'next/link';
import {signIn} from '../actions';
export const dynamic='force-dynamic';
export default async function Login({searchParams}:{searchParams:Promise<{erro?:string;confirmado?:string}>}){
  const p=await searchParams;
  const configured=Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  return <main className="shell login-wrap"><span className="eyebrow">ATELIER COMMERCE</span><h1>Gerencie sua loja.</h1>
    <p className="help-text">Um único acesso para administrar produtos, estoque, pedidos e configurações.</p>
    {!configured&&<p className="notice">O ambiente de banco de dados ainda não está conectado. O acesso será habilitado após o provisionamento.</p>}
    {p.erro&&<p className="alert">Não foi possível autenticar. Confira o e-mail, senha e status de confirmação da sua conta.</p>}
    {p.confirmado&&<p className="notice">E-mail confirmado. Agora você pode entrar.</p>}
    <div className="panel"><form action={signIn}>
      <label className="field">E-mail<input required autoComplete="username" type="email" name="email" placeholder="voce@empresa.com.br"/></label>
      <label className="field">Senha<input required autoComplete="current-password" type="password" name="password"/></label>
      <button className="btn btn-dark full" type="submit" disabled={!configured}>Entrar no painel</button>
    </form></div>
    <p className="help-text">Ainda não tem conta? <Link className="text-link" href="/admin/cadastro">Cadastre sua empresa</Link>.</p>
  </main>;
}
