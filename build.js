import shell from "shelljs";
import rovel from "rovel.js";
rovel.env.config();
import fs from "node:fs";
import pkg from "./package.json" with { type: "json" };


if (pkg.checkCache == "true" && !Deno.args.join(" ").includes("--force")) {
  try {
    if (fs.existsSync("./src/public/assets/img/bot/logo-36.png")) {
      console.log("Build cache was found. Skipping build.");
    } else {
      shell.exec("chmod +x run.sh && ./run.sh");
    }
  } catch (err) {
    console.error(err);
  }
} else {
  console.log("Running build without checking cache.");
  shell.exec("chmod +x run.sh && ./run.sh");
}
