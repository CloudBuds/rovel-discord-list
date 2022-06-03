const Discord = require("discord.js");
const fs = require("fs");
const normalText = require("diacritics").remove;
var client = new Discord.Client({
  intents: [new Discord.Intents(32767)],
  allowedMentions: { parse: ["users", "roles"], repliedUser: true },
});
client.login(process.env.TOKEN);
globalThis.privatebot = client;
const { fetch } = require("rovel.js");
const { owners, emojiapprovers, mods, contributors } = require("../data.js");
client.owners = owners;
client.emojiapprovers = emojiapprovers;
client.mods = mods;
client.contributors = contributors;
var cooldownearn = new Set();
client.cooldownearn = cooldownearn;
client.commands = [];
const prefix = process.env.PRIVATE_PREFIX;

function getMention(mention) {
  if (!mention) return;
  if (mention.startsWith("<@") && mention.endsWith(">")) {
    mention = mention.slice(2, -1);
    if (mention.startsWith("!")) {
      mention = mention.slice(1);
    }
  }
  return client.users.cache.get(mention);
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
    .readdirSync(__dirname + "/commands")
    .filter((file) => file.endsWith(".js"));
  let ci = 0;
  let cj = commandFiles.length;
  for (var file of commandFiles) {
    const command = fs.readFileSync(`${__dirname}/commands/${file}`, {
      encoding: "utf8",
      flag: "r",
    });
    ci += 1;
    console.log(`[BOT] Command Loaded - ${file} (${ci}/${cj})`);
    file = file.replace(".js", "");
    const desc = fs.readFileSync(`${__dirname}/desc/${file}.md`, {
      encoding: "utf8",
      flag: "r",
    });
    client.commands.push({ name: file, code: command, desc });
  }
}
reload();
var eventFiles = fs
  .readdirSync(__dirname + "/events")
  .filter((file) => file.endsWith(".js"));
let ei = 0;
let ej = eventFiles.length;
for (var file of eventFiles) {
  const event = fs.readFileSync(`${__dirname}/events/${file}`, {
    encoding: "utf8",
    flag: "r",
  });
  ei += 1;
  console.log(`[BOT] Event Loaded - ${file} (${ei}/${ej})`);
  try {
    eval(event);
  } catch (e) {
    console.warn(
      "[BOT] Event Error!\n```\n" + e.stack.slice(0, 1880) + "...\n```\n"
    );
  }
}

function DiscordLog({ title, desc, color }) {
  const msg = new Discord.MessageEmbed()
    .setTitle(title)
    .setColor(color || "#5865F2")
    .setDescription(desc)
    .setURL("https://discord.rovelstars.com")
    .setTimestamp()
    .setThumbnail("https://discord.rovelstars.com/favicon.ico");

  client.guilds.cache
    .get("602906543356379156")
    .channels.cache.get("889696494758789191")
    .send({ embeds: msg });
}

let router = require("express").Router();
router.use(require("express").json());
router.get("/", (req, res) => {
  res.send("hmm");
});
router.post("/eval", (req, res) => {
  if (!req.body.secret) {
    res.json({ err: "no_secret" });
  } else {
    if (req.body.secret == process.env.SECRET) {
      const resp = eval(req.body.code);
      res.json({ resp });
    } else {
      res.json({ err: "unauth" });
    }
  }
});

router.get("/id", (req, res) => {
  res.json({ id: client.user.id });
});
router.get("/mainserver/:id", (req, res) => {
  let user;
  try {
    user = client.guilds.cache
      .get("602906543356379156")
      .members.cache.get(req.params.id).user;
  } catch {
    user = null;
  }
  const condition = user ? true : false;
  res.json({ condition });
});

client.isInMain = function (id) {
  let user;
  try {
    user = client.guilds.cache
      .get("602906543356379156")
      .members.cache.get(id).user;
  } catch {
    user = null;
  }
  const condition = user ? true : false;
  return condition;
};

router.get("/bannedusers", (req, res) => {
  res.json(BannedList);
});

router.get("/bannedusers/:id", (req, res) => {
  if (BannedList.includes(req.params.id)) res.json({ banned: true });
  else res.json({ banned: false });
});

router.get("/users/:id", (req, res) => {
  try {
    var user = client.users.cache.get(req.params.id);
    if (user == null) {
      client.users
        .fetch(req.params.id)
        .then((d) => {
          if (d.avatar == null) d.avatar = d.discriminator % 5;
          res.json(d);
        })
        .catch((e) => {
          if (!res.headersSent) res.json({ err: "invalid_user" });
        });
    } else {
      if (user.avatar == null)
        user.avatar = (user.discriminator % 5).toString();
      res.json(user);
    }
  } catch (e) {
    res.json({ err: "invalid_user" });
  }
});
router.get("/owners", (req, res) => {
  res.json({ owners: client.owners });
});
router.get("/owner/:id", (req, res) => {
  if (req.params.id) {
    var condition = client.owners.includes(req.params.id);
    res.json({ condition });
  } else res.json({ error: "id_not_sent" });
});
router.get("/emojiapprovers", (req, res) => {
  res.json({ emojiapprovers: client.emojiapprovers });
});
router.get("/emojiapprovers/:id", (req, res) => {
  if (req.params.id) {
    var condition = client.emojiapprovers.includes(req.params.id);
    res.json({ condition });
  } else res.json({ error: "id_not_sent" });
});
router.get("/mods", (req, res) => {
  res.json({ mods: client.mods });
});
router.get("/mods/:id", (req, res) => {
  if (req.params.id) {
    var condition = client.mods.includes(req.params.id);
    res.json({ condition });
  } else res.json({ error: "id_not_sent" });
});
router.get("/contributors", (req, res) => {
  res.json({ contributors: client.contributors });
});
router.get("/contributors/:id", (req, res) => {
  if (req.params.id) {
    var condition = client.contributors.includes(req.params.id);
    res.json({ condition });
  } else res.json({ error: "id_not_sent" });
});
router.post("/log", (req, res) => {
  try {
    if (req.body.secret === process.env.SECRET) {
      if (req.body.desc.length > 2000) {
        req.body.desc = req.body.desc.slice(0, 1997) + "...";
      }
      const msg = new Discord.MessageEmbed()
        .setTitle(req?.body?.title || "RDL Logging")
        .setColor(req?.body?.color || "#5865F2")
        .setDescription(req?.body?.desc || "No description provided.\n:/&&")
        .setImage(req?.body?.attachment)
        .setURL(req?.body?.url || "https://discord.rovelstars.com")
        .setTimestamp()
        .setThumbnail(
          req?.body?.img ||
            "https://discord.rovelstars.com/assets/img/bot/logo-512.png"
        );
      if (req.body.channel != "private") {
        client.guilds.cache
          .get("602906543356379156")
          .channels.cache.get(req.body.channel || "889696494758789191")
          .send({ embeds: [msg] });
      }
      if (req.body.owners) {
        for (const owner of req.body.owners) {
          client.users.cache
            .get(owner)
            .send({
              content: `<@!${owner}> A new Notification!`,
              embeds: [msg],
            })
            .catch((e) => {
              const embed = new Discord.MessageEmbed()
                .setTitle(
                  `Failed to Send DM: ${req.body.title || "RDL Logging"}`
                )
                .setColor(req.body.color || "#5865F2")
                .setDescription(
                  req.body.desc || "No description provided.\n:/&&"
                )
                .setImage(req.body.attachment)
                .setURL(req.body.url || "https://discord.rovelstars.com")
                .setTimestamp()
                .setThumbnail(
                  req.body.img ||
                    "https://discord.rovelstars.com/assets/img/bot/logo-512.png"
                )
                .setFooter(
                  `${
                    client.users.cache.get(owner).username
                  }, If you have read this message, click tick to delete this notification.`
                );

              client.guilds.cache
                .get("602906543356379156")
                .channels.cache.get("889429029898321921")
                .send({
                  content: `<@!${client.users.cache.get(owner).id}>`,
                  embeds: [embed],
                })
                .then((msg) => {
                  msg.react("✅");
                });
            });
        }
      }
      res.json({ code: "worked" });
    } else {
      res.json({ error: "wrong_or_no_key" });
    }
  } catch {}
});
module.exports = router;
