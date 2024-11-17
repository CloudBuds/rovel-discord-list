import { fetch } from "rovel.js";
function log(text) {
  fetch(Deno.env.get("CONSOLE_LOG"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username: "RDL console.log",
      content: text,
    }),
  });
  if (Deno.env.get("CONSOLE_LOG")) globalThis.logg(text);
}

function error(text) {
  fetch(Deno.env.get("CONSOLE_LOG"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username: "RDL console.error",
      content: text,
    }),
  });
  if (Deno.env.get("CONSOLE_LOG")) globalThis.logerr(text);
}

function warn(text) {
  fetch(Deno.env.get("CONSOLE_LOG"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      username: "RDL console.warn",
      content: text,
    }),
  });
  if (Deno.env.get("CONSOLE_LOG")) globalThis.warnn(text);
}
export { log, error, warn };
