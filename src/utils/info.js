import { fetch } from "rovel.js";
async function info(id) {
  return await fetch(`${Deno.env.get("DOMAIN")}/api/client/users/${id}`).then((r) =>
    r.json()
  );
}
export default info;
