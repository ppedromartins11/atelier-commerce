import { signIn } from '../actions';
export const dynamic='force-dynamic';
export default async function Login({searchParams}:{searchParams:Promise<{erro?:string}>}){
  const p=await searchParams;
  const configured=Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
  return <main className="shell login-wrap"><span className="eyebrow">ÁREA RESTRITA</span><h1>Acesso à gestão.</h1>
  {!configured&&<p className="notice">O banco de dados desta loja ainda não foi configurado. Conecte um projeto Supabase dedicado para ativar o painel.</p>}
  {p.erro&&<p className="alert">Não foi possível entrar. Verifique as credenciais e sua permissão de administrador da loja.</p>}
  <div className="panel"><form action={signIn}><label className="field">E-mail<input required autoComplete="username" type="email" name="email" placeholder="voce@loja.com.br"/></label><label className="field">Senha<input required autoComplete="current-password" type="password" name="password" placeholder="Sua senha"/></label><button className="btn btn-dark full" type="submit" disabled={!configured}>Entrar no painel</button></form></div>
  <p className="help-text">Por segurança, somente usuários previamente autorizados podem administrar uma loja. O cadastro público de administradores está desativado.</p></main>;
}
