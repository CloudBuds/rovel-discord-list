import OAuthClient from "disco-oauth";
const auth = new OAuthClient(Deno.env.get("ID"), Deno.env.get("SECRET"));
auth.scopes = ["identify", "email", "guilds.join"];
auth.redirectURI = `${Deno.env.get("DOMAIN")}/api/auth`;
export default auth;
