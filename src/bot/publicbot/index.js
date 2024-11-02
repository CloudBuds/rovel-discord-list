import Discord from "discord.js";
import fs from "node:fs";
import { remove as normalText } from "diacritics";
import { fetch } from "rovel.js";
import { owners, emojiapprovers, mods, contributors } from "../../data.js";

var client = new Discord.Client({
  intents: [new Discord.Intents(32767)], //32509
});
if (Deno.env.get("PUBLIC_TOKEN"))
  client.login(Deno.env.get("PUBLIC_TOKEN"));
globalThis.publicbot = client;
client.owners = owners;
client.emojiapprovers = emojiapprovers;
client.mods = mods;
client.contributors = contributors;
client.commands = [];
const prefix = Deno.env.get("PUBLIC_PREFIX") || "R!";
var cooldownearn = new Set();
client.cooldownearn = cooldownearn;

function getMention(mention) {
  if (!mention) return;
  if (mention.startsWith("<@") && mention.endsWith(">")) {
    mention = mention.slice(2, -1);
    if (mention.startsWith("!")) {
      mention = mention.slice(1);
    }
  }
  return client.users.cache.get(mention); //main bot doesnt cache anything sed...
}
function searchCommand(name) {
  for (var i = 0; i < client.commands.length; i++) {
    if (client.commands[i].name == name) return client.commands[i];
  }
}

function reload() {
  delete client.commands;
  client.commands = [];
  var commandFiles = fs
    .readdirSync(import.meta.dirname + "/commands")
    .filter((file) => file.endsWith(".js"));
  let ci = 0;
  let cj = commandFiles.length;
  for (var file of commandFiles) {
    const command = fs.readFileSync(`${import.meta.dirname}/commands/${file}`, {
      encoding: "utf8",
      flag: "r",
    });
    ci += 1;
    console.log(`[PUBLIC BOT] Command Loaded - ${file} (${ci}/${cj})`);
    file = file.replace(".js", "");
    const desc = fs.readFileSync(`${import.meta.dirname}/desc/${file}.md`, {
      encoding: "utf8",
      flag: "r",
    });
    client.commands.push({ name: file, code: command, desc });
  }
}
reload();
var eventFiles = fs
  .readdirSync(import.meta.dirname + "/events")
  .filter((file) => file.endsWith(".js"));
let ei = 0;
let ej = eventFiles.length;
for (var file of eventFiles) {
  const event = fs.readFileSync(`${import.meta.dirname}/events/${file}`, {
    encoding: "utf8",
    flag: "r",
  });
  ei += 1;
  console.log(`[PUBLIC BOT] Event Loaded - ${file} (${ei}/${ej})`);
  try {
    (`(async()=>{${event}})()`);
  } catch (e) {
    console.warn(
      "[PUBLIC BOT] Event Error!\n```\n" + e.stack.slice(0, 1880) + "...\n```\n"
    );
  }
}
function DiscordLog({ title, desc, color }) {
  const msg = new Discord.MessageEmbed()
    .setTitle(title)
    .setColor(color || "#5865F2")
    .setDescription(desc)
    .setURL(Deno.env.get("DOMAIN"))
    .setTimestamp()
    .setThumbnail(`${Deno.env.get("DOMAIN")}/favicon.ico`);

  client.guilds.cache
    .get("602906543356379156")
    .channels.cache.get("889696494758789191")
    .send({ embeds: [msg] });
}
