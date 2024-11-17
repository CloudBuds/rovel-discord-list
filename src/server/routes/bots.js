import validator from "validator";
import { owners } from "../../data.js";
import passgen from "../../utils/passgen.js";
import { fetch } from "rovel.js";
import schedule from "node-schedule";
import { Router } from "express";
const router = Router();
router.use(express.json());
globalThis.coronaSanitizer = sanitizeHtml;

const rule = new schedule.RecurrenceRule();
rule.dayOfWeek = 0;
rule.hour = 12;
rule.minute = 0;
schedule.scheduleJob(rule, async function () {
  Cache.Bots.find({}).then(async (bots) => {
    for (var bot of bots) {
      bot.votes = 0;
      bot.save();
    }
  });
  fetch(`${Deno.env.get("DOMAIN")}/api/client/log`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      secret: Deno.env.get("SECRET"),
      channel: "889695874152804383",
      desc: `It is now the Scheduled Time!\nThe Votes of all (${Cache.AllBots.length}) bots will now be **RESET**!\nStart voting your bots again to reach the top of the Leaderboard!`,
      title: "Votes Reset!",
      color: "#ff0000",
    }),
  });
});

schedule.scheduleJob("* 0 * * *", async function () {
  Cache.Bots.find({}).then(async (bots) => {
    for (var [i, bot] of bots.entries()) {
      updateBotServers(bot, i);
    }
  });
});

function updateBotServers(bot, i) {
  if (Deno.env.get("SELFBOT_TOKEN")) {
    setTimeout(async () => {
      var r = await selfbot(`/oauth2/authorize?client_id=${bot?.id || bot}&scope=bot`);
      bot.servers = await r.bot.approximate_guild_count;
      await bot.save();
    }, i ? (2000 * i) : 100);
  }
}
globalThis.updateBotServers = updateBotServers;

router.get("/", (req, res) => {
  if (req.query.q) {
    res.json(
      shuffle(Search(Cache.Bots.clean(Cache.AllBots), req.query.q)).slice(0, 10)
    );
  } else {
    if (req.query.secret == Deno.env.get("SECRET")) res.json(Cache.AllBots);
    else {
      const limit = Math.min(req.query.limit || 30, 30);
      const offset = req.query.offset || 0;
      return res.json(Cache.Bots.clean(Cache.AllBots).slice(offset, offset + limit));
    }
  }
});

router.get("/top", (req, res) => {
  //Cache.Bots.sortTopVoted()
  return res.json(Cache.Bots.clean(Cache.Bots.sortTopVoted()));
});

router.get("/:id/changeVoteType", (req, res) => {
  if (!req.query.key) res.json({ err: "not_logged in" });
  else {
    fetch(`${Deno.env.get("DOMAIN")}/api/auth/user?key=${req.query.key}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.err) return res.json({ err: "invalid_key" });
        if (req.query.type) {
          let bot = Cache.Bots.findOneById(req.params.id);
          if (!bot) return res.json({ err: "bot_not_found" });
          if (!bot.owners.includes(d.id)) return res.json({ err: "unauth" });
          if (req.query.type == "coins") {
            bot.opted_coins = true;
            bot.save();
          }
          else if (req.query.type == "time") {
            bot.opted_coins = false;
            bot.save();
          }
          return res.json({ type: bot.opted_coins ? "coins" : "time" });
        }
        else {
          let bot = Cache.Bots.findOneById(req.params.id);
          return res.json({ type: bot.opted_coins ? "coins" : "time" });
        }
      });
  }
})

router.get("/report", (req, res) => {
  if (req.query.leaked) {
    var bot = Cache.Bots.findOneByCode(req.query.leaked);
    if (bot) {
      fetch(`${Deno.env.get("DOMAIN")}/api/client/log`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          secret: Deno.env.get("SECRET"),
          title: `${bot.tag} Code Leaked!`,
          desc: `We would like to inform you that your bot code was leaked. Hopefully it was reported by one of our SDKs about it. We have Reset your token. Do update it in your bot's code. Never share your bot's code with anyone!\nPlease get the new token from [here]<${Deno.env.get("DOMAIN")}/api/bots/${bot.id}/code> \nThank you.`,
          owners: bot.owners,
          attachment: bot.avatarURL,
          channel: "private",
        }),
      });
    } else {
      res.json({ err: "invalid_code" });
    }
  } else res.json({ err: "no_key" });
});

router.get("/info", (req, res) => {
  if (!req.query.code) return res.json({ err: "no_code" });
  var ba = Cache.Bots.findOneByCode(req.query.code);
  if (!ba) return res.json({ err: "invalid_code" });
  else {
    res.json(Cache.Bots.clean(ba));
  }
});

router.post("/:id/card", (req, res) => {
  if (req.query.code) {
    Cache.Bots.findOneByBoth(req.params.id, req.params.code).then((bot) => {
      if (!bot) return res.json({ err: "bot_not_found" });
      else {
        if (req.body.img) {
          if (!validator.isURL(req.body.img))
            return res.json({ err: "invalid_img" });
          else bot.card.img = req.body.img;
        }
        if (req.body.title) {
          bot.card.title = req.body.title;
        }
        if (req.body.msg) {
          bot.card.msg = req.body.msg;
        }
        bot.save();
        res.json({ card: "updated" });
      }
    });
  } else return res.json({ err: "no_code" });
});

router.get("/:id/vote", async (req, res) => {
  if (!req.query.key) res.json({ err: "not_logged in" });
  else {
    fetch(`${Deno.env.get("DOMAIN")}/api/auth/user?key=${req.query.key}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.err) return res.json({ err: "invalid_key" });
        //check if the votes array of user has the bot
        Cache.Users.findOne({ id: d.id }).then(async (use) => {
          let bot = await Cache.Bots.findOneById(req.params.id);
          let votingType = bot.opted_coins ? "coins" : "time";
          let hmm;
          if (votingType == "time") {
            if (!use.votes) use.votes = [];
            //find the bot from votes: [{bot, at}]
            let Vote = use.votes.find((b) => b.bot == req.params.id);
            let allow = false;
            if (Vote) {
              //check if Vote.at is older than 24 hours
              if (Date.now() - Vote.at > 86400000) {
                //if it is older than 24 hours, remove it from the votes array
                use.votes = use.votes.filter((b) => b.bot != req.params.id);
                allow = true;
              }
            }
            if (!Vote) allow = true;
            if (allow) {
              //we can approve the vote
              use.votes.push({ bot: req.params.id, at: Date.now() });
              use.save();
              bot.votes = bot.votes + 1;
              bot.save();
              res.json({ success: true });
              if (bot.webhook) {
                hmm = JSON.stringify({
                  user: Cache.Users.clean(use),
                  id: use.id,
                  coins: 10,
                  votes: 1,
                  currentVotes: bot.votes,
                });

                fetch(`${bot.webhook}?code=${bot.code}`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: bot.code,
                  },
                  body: hmm,
                })
                  .then((r) => {
                    if (r.status >= 300 || r.status < 200) {
                      fetch(`${Deno.env.get("DOMAIN")}/api/client/log`, {
                        method: "POST",
                        headers: {
                          "content-type": "application/json",
                        },
                        body: JSON.stringify({
                          secret: Deno.env.get("SECRET"),
                          title: `Failed to send data to ${bot.tag}`,
                          desc: `Uh Oh! It seems as if the bot sent unexpected response!\nThe data we posted was:\n\`\`\`json\n${hmm}\n\`\`\`\nPlease send this data to your bot incase the bot wanted it.`,
                          owners: bot.owners,
                          img: bot.avatarURL,
                        }),
                      });
                    }
                  })
                  .catch((e) => {
                    fetch(`${Deno.env.get("DOMAIN")}/api/client/log`, {
                      method: "POST",
                      headers: {
                        "content-type": "application/json",
                      },
                      body: JSON.stringify({
                        secret: Deno.env.get("SECRET"),
                        title: `Failed to send data to ${bot.tag}`,
                        desc: `Uh Oh! It seems as if the bot couldn't recieve the vote data!\nThe data we posted was:\n\`\`\`json\n${hmm}\n\`\`\`\nPlease send this data to your bot incase the bot wanted it.`,
                        owners: bot.owners,
                        img: bot.avatarURL,
                      }),
                    });
                  });
              }
            } else {
              let start = new Date(Vote.at);
              start.setDate(start.getDate() + 1);
              let start2 = new Date();
              let ree = Math.floor((start.getTime() - start2.getTime()) / 1000);
              function secondsToHms(d) {
                d = Number(d);
                var h = Math.floor(d / 3600);
                var m = Math.floor((d % 3600) / 60);
                var s = Math.floor((d % 3600) % 60);

                var hDisplay = h > 0 ? h + (h == 1 ? " hour " : " hours ") : "";
                var mDisplay =
                  m > 0 ? m + (m == 1 ? " minute " : " minutes ") : "";
                var sDisplay = s > 0 ? s + (s == 1 ? " second" : " seconds") : "";
                return hDisplay + mDisplay + sDisplay;
              }
              res.json({ success: false, try_after: secondsToHms(ree) });
            }
          }
          else if (votingType == "coins") {
            if (!req.query.coins) return res.json({ err: "no_coins" });
            if (req.query.coins <= 0) return res.json({ err: "negative_coins" });
            if (req.query.coins % 10 != 0)
              return res.json({ err: "coins_not_divisible" });
            const Vote = parseInt(req.query.coins) / 10;
            Users.findOne({ id: d.id }).then((use) => {
              if (!use) return res.json({ err: "no_user_found" });
              if (use.bal < req.query.coins)
                return res.json({ err: "not_enough_coins" });
              var bot = Cache.Bots.findOneById(req.params.id);
              if (!bot) return res.json({ err: "no_bot_found" });
              use.bal = use.bal - req.query.coins;
              use.save();
              bot.votes = bot.votes + parseInt(Vote);
              bot.save();
              res.json({ bot });
              if (bot.webhook) {
                const hmm = JSON.stringify({
                  user: Cache.Users.clean(use),
                  coins: parseInt(req.query.coins),
                  votes: Vote,
                  currentVotes: bot.votes,
                });
                fetch(`${bot.webhook}?code=${bot.code}`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: bot.code,
                  },
                  body: hmm,
                })
                  .then((r) => {
                    if (r.status >= 300 || r.status < 200) {
                      fetch(`${Deno.env.get("DOMAIN")}/api/client/log`, {
                        method: "POST",
                        headers: {
                          "content-type": "application/json",
                        },
                        body: JSON.stringify({
                          secret: Deno.env.get("SECRET"),
                          title: `Failed to send data to ${bot.tag}`,
                          desc: `Uh Oh! It seems as if the bot sent unexpected response!\nThe data we posted was:\n\`\`\`json\n${hmm}\n\`\`\`\nPlease send this data to your bot incase the bot wanted it.`,
                          owners: bot.owners,
                          img: bot.avatarURL,
                        }),
                      });
                    }
                  })
                  .catch((e) => {
                    fetch(`${Deno.env.get("DOMAIN")}/api/client/log`, {
                      method: "POST",
                      headers: {
                        "content-type": "application/json",
                      },
                      body: JSON.stringify({
                        secret: Deno.env.get("SECRET"),
                        title: `Failed to send data to ${bot.tag}`,
                        desc: `Uh Oh! It seems as if the bot couldn't recieve the vote data!\nThe data we posted was:\n\`\`\`json\n${hmm}\n\`\`\`\nPlease send this data to your bot incase the bot wanted it.`,
                        owners: bot.owners,
                        img: bot.avatarURL,
                      }),
                    });
                  });
              }
            });
          }
        });
      });
  }
});

router.post("/evaldb", (req, res) => {
  if (!req.query.key) return res.json({ err: "no_key" });
  fetch(`${Deno.env.get("DOMAIN")}/api/auth/user?key=${req.query.key}`)
    .then((r) => r.json())
    .then((d) => {
      if (d.err) return res.json({ err: "invalid_key" });
      if (!owners.includes(d.id)) return res.json({ err: "unauth" });
      try {
        eval(`(async()=>{${req.body.code}})()`);;
      } catch (e) {
        res.json({ e });
      }
    });
});

router.get("/:id/sync", (req, res) => {
  var user = Cache.Bots.findOneById(req.params.id);
  if (!user) {
    res.json({ err: "not_found" });
  } else {
    fetch(`${Deno.env.get("DOMAIN")}/api/client/users/` + user.id)
      .then((r) => r.json())
      .then((u) => {
        if (
          u.avatar === user.avatar &&
          u.username === user.username &&
          u.discriminator === user.discriminator
        )
          return res.json({ err: "same_data" });
        else {
          var num;
          if (u.avatar !== user.avatar) {
            user.avatar = u.avatar;
            num = "Avatar Updated!\n";
          }
          if (u.username !== user.username) {
            user.username = u.username;
            num = "Username Updated!\n";
          }
          if (u.discriminator !== user.discriminator) {
            user.discriminator = u.discriminator;
            num = "Discriminator Updated!\n";
          }
          user.save();
          res.json({ success: true, bot: user });
          fetch(`${Deno.env.get("DOMAIN")}/api/client/log`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              secret: Deno.env.get("SECRET"),
              img: u.avatarURL,
              desc: num,
              title: `Bot ${u.tag} Data Updated!`,
              color: "#FEE75C",
              url: `${Deno.env.get("DOMAIN")}/bots/${u.id}`,
            }),
          });
        }
      });
  }
});

router.get("/:id/code", (req, res) => {
  if (!req.query.key) return res.json({ err: "no_key" });

  fetch(`${Deno.env.get("DOMAIN")}/api/auth/user?key=${req.query.key}`)
    .then((r) => r.json())
    .then(async (d) => {
      if (d.err) return res.json({ err: "invalid_key" });

      var bot = Cache.Bots.findOneById(req.params.id);
      if (!bot) return await res.json({ err: "no_bot_found" });
      if (bot.owners.includes(d.id)) {
        if (!bot.code) {
          bot.code = await passgen();
          await bot.save();
        }
        await res.json({ code: bot.code });
      }
      if (!bot.owners.includes(d.id)) {
        return await res.json({ err: "unauth" });
      }
    });
});
import express from "express";
import sanitizeHtml from "sanitize-html";
import sluggy from "../../utils/sluggy.js";
router.get("/:id/slug", (req, res) => {
  if (!req.query.key) return res.json({ err: "no_key" });
  fetch(`${Deno.env.get("DOMAIN")}/api/auth/user?key=${req.query.key}`)
    .then((r) => r.json())
    .then(async (d) => {
      if (d.err) return res.json({ err: "invalid_key" });

      var bot = Cache.Bots.findOneById(req.params.id);
      if (!bot) return await res.json({ err: "no_bot_found" });
      if (bot.owners.includes(d.id)) {
        if (req.query.slug) {
          Cache.Bots.findOne({ slug: req.query.slug }).then(async (bb) => {
            if (bb && bb?.id != bot.id) {
              res.json({ err: "used_slug" });
            } else {
              bot.slug = sluggy(req.query.slug == "" ? bot.id : req.query.slug);
              bot.save();
              await res.json({ slug: bot.slug });
            }
          });
        } else res.json({ slug: bot.slug });
      }
      if (!bot.owners.includes(d.id)) {
        return await res.json({ err: "unauth" });
      }
    });
});

router.get("/:id", (req, res) => {
  if (req?.secret == Deno.env.get("SECRET")) {
    let botu = Cache.Bots.clean(Cache.Bots.findOneById(req.params.id));
    botu.code = Cache.Bots.findOneById(req.params.id).code;
    botu.webhook = Cache.Bots.findOneById(req.params.id).webhook;
    res.json(botu);
    Cache.Bots.refreshOne(req.params.id);
  } else {
    res.json(Cache.Bots.clean(Cache.Bots.findOneById(req.params.id)));
    Cache.Bots.refreshOne(req.params.id);
  }
});

router.post("/:id/servers", (req, res) => {
  if (!req.query.code) return res.json({ err: "no_code" });
  if (isNaN(req.body.count)) return res.json({ err: "NaN" });
  Cache.Bots.findOne({ code: req.query.code, id: req.params.id }).then((b) => {
    if (!b) return res.json({ err: "invalid_code" });
    else {
      b.servers = req.body.count;
      b.save();
      res.json({ success: true });
    }
  });
});

router.delete("/:id", async (req, res) => {
  if (!req.query.key) return res.json({ err: "no_key" });

  fetch(`${Deno.env.get("DOMAIN")}/api/auth/user?key=${req.query.key}`)
    .then((r) => r.json())
    .then(async (d) => {
      if (d.err) return res.json({ err: "invalid_key" });

      await Bots.findOne({ id: req.params.id }).then((bot) => {
        if (!bot) return res.json({ err: "no_bot_found" });
        if (bot.mainowner == d.id) {
          Bots.deleteOne({ id: req.params.id }, function (err) {
            if (err) return res.json(err);
            res.json({ deleted: true });
            fetch(`${Deno.env.get("DOMAIN")}/api/client/log`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                secret: Deno.env.get("SECRET"),
                desc: `Bot <@!${req.params.id}> has been deleted by <@!${d.id
                  }>\nThe data deleted is:\n\`\`\`\n${JSON.stringify(
                    bot
                  )}\n\`\`\`\nIncase it was deleted accidentally, the above data may be added back again manually if the bot is added back to RDL`,
                title: "Bot Deleted!",
                color: "#ff0000",
                owners: bot.owners,
                img: bot.avatarURL,
                url: Deno.env.get("DOMAIN"),
              }),
            });
          });
        } else return res.json({ err: "unauth" });
      });
    });
});


router.get("/import/voidbots/:id", (req, res) => {
  if (req.query.key) {
    var userid;
    fetch(`${Deno.env.get("DOMAIN")}/api/auth/user?key=${req.query.key}`)
      .then((r) => r.json())
      .then((user) => {
        userid = user.id;
        fetch(`https://api.voidbots.net/bot/info/${req.params.id}`, {
          method: "GET",
          headers: {
            Authorization: `${Deno.env.get("VOIDTOKEN")}`,
          },
        })
          .then((r) => r.json())
          .then((bot) => {
            if (bot.error || bot.message)
              return res.json({
                err: "not_found",
              });
            if (bot.owners.includes(userid)) {
              var abot = {
                id: bot.botid,
                lib: "none",
                prefix: bot.prefix,
                short: bot.blurb,
                desc: bot.description,
                support: bot.links.supportserver,
                owners: bot.owners,
                invite: bot.links.invite,
                github: bot.links.github,
                website: bot.links.website,
                donate: bot.links.donate == "" ? null : bot.links.donate,
                imported: "Void Bots",
              };
              fetch(`${Deno.env.get("DOMAIN")}/api/bots/new`, {
                method: "POST",
                headers: {
                  "content-type": "application/json",
                },
                body: JSON.stringify(abot),
              })
                .then((r) => r.json())
                .then((d) => {
                  res.json(d);
                });
            } else {
              return res.json({ err: "unauth_owner" });
            }
          });
      });
  } else {
    res.json({ err: "no_key" });
  }
});

router.get("/import/topgg/:id", (req, res) => {
  if (req.query.key) {
    var userid;
    fetch(`${Deno.env.get("DOMAIN")}/api/auth/user?key=${req.query.key}`)
      .then((r) => r.json())
      .then((user) => {
        userid = user.id;
        fetch(`https://top.gg/api/bots/${req.params.id}`, {
          method: "GET",
          headers: {
            Authorization: `${globalThis.TOPGGTOKEN()}`,
          },
        })
          .then((r) => r.json())
          .then((bot) => {
            if (bot.error)
              return res.json({
                err: bot.error.toLowerCase().split(" ").join("_"),
              });
            if (bot.owners.includes(userid)) {
              var abot = {
                id: bot.id,
                lib: bot.lib == "" ? "none" : bot.lib,
                prefix: bot.prefix,
                short: bot.shortdesc,
                desc: bot.longdesc,
                support: bot.support,
                bg: bot.bannerUrl,
                owners: bot.owners,
                invite: bot.invite,
                github: bot.github,
                website: bot.website,
                imported: "Top.gg",
              };
              fetch(`${Deno.env.get("DOMAIN")}/api/bots/new`, {
                method: "POST",
                headers: {
                  "content-type": "application/json",
                },
                body: JSON.stringify(abot),
              })
                .then((r) => r.json())
                .then((d) => {
                  res.json(d);
                });
            } else {
              return res.json({ err: "unauth_owner" });
            }
          });
      });
  } else {
    res.json({ err: "no_key" });
  }
});

router.get("/import/del/:id", (req, res) => {
  if (req.query.key) {
    fetch(`${Deno.env.get("DOMAIN")}/api/auth/user?key=${req.query.key}`)
      .then((r) => r.json())
      .then((user) => {
        fetch(`https://api.discordextremelist.xyz/v2/bot/${req.params.id}`)
          .then((r) => r.json())
          .then((bot) => {
            if (bot.error) {
              res.json({ err: bot.message });
            } else {
              if (bot.bot.owner.id == user.id) {
                var abot = {
                  id: bot.bot.id,
                  lib: bot.bot.library == "" ? "none" : bot.bot.library,
                  prefix: bot.bot.prefix,
                  short: bot.bot.shortDesc,
                  desc: bot.bot.longDesc,
                  owners: [bot.bot.owner.id],
                  invite: bot.bot.links.invite,
                  support: bot.bot.links.support,
                  github: bot.bot.links.repo,
                  website: bot.bot.links.website,
                  donate:
                    bot.bot.links.donation == ""
                      ? null
                      : bot.bot.links.donation,
                  imported: "DEL",
                };
                fetch(`${Deno.env.get("DOMAIN")}/api/bots/new`, {
                  method: "POST",
                  headers: {
                    "content-type": "application/json",
                  },
                  body: JSON.stringify(abot),
                })
                  .then((r) => r.json())
                  .then((d) => {
                    res.json(d);
                  });
              } else {
                return res.json({ err: "unauth_owner" });
              }
            }
          });
      });
  } else {
    res.json({ err: "no_key" });
  }
});

router.post("/edit", async (req, res) => {
  let err;
  if (!req.body.id) return res.json({ err: "no_id" });
  Bots.findOne({ id: req.body.id }).then(async (bot) => {
    if (!err && !bot) err = "bot_not_found";
    fetch(`${Deno.env.get("DOMAIN")}/api/auth/user?key=${req.query.key}`)
      .then((r) => r.json())
      .then(async (d) => {
        if (!err && d.err) err = "invalid_key";
        if (
          !err &&
          !bot.owners.includes(d.id) &&
          !privatebot.owners.includes(d.id)
        )
          err = "unauth";
      });
    if (!err && req.body.webhook) {
      if (!err && req.body.webhook !== bot.webhook) {
        if (!err && !validator.isURL(req.body.webhook)) err = "invalid_webhook";
        else bot.webhook = req.body.webhook;
      }
    }
    if (!err && req.body.owners) {
      req.body.owners = [...new Set(req.body.owners)];
      if (!err && rovel.func.isEqual(req.body.owners, bot.owners)) {
        var cond = true;

        fetch(
          `${Deno.env.get("DOMAIN")}/api/client/mainserver/${req.body.owners[0]}`
        )
          .then((r) => r.json())
          .then((d) => {
            cond = cond == true && d.condition == false ? false : true;
          });

        if (!err && !cond) err = "owner_not_in_server";
        if (!err && cond) {
          let role = privatebot.guilds.cache
            .get("602906543356379156")
            .roles.cache.get("889746788024725564");
          bot.owners.forEach((meme) => {
            member = privatebot.guilds.cache
              .get("602906543356379156")
              .members.cache.get(meme);
            if (!member) return;
            member.roles.remove(role).catch((e) => console.log(e));
          });
          bot.owners = req.body.owners;
          bot.owners.forEach((meme) => {
            member = privatebot.guilds.cache
              .get("602906543356379156")
              .members.cache.get(meme);
            if (!member) return;
            member.roles.add(role).catch((e) => console.log(e));
          });
        }
      }
    }
    if (!err && req.body.desc) {
      if (!err && req.body.desc !== bot.desc) {
        if (
          !err &&
          req.body.desc.length < 100 &&
          !req.body.desc.includes("iframe")
        )
          err = "invalid_desc";
        else {
          req.body.desc = req.body.desc
            .replaceAll("\r\n", "\n")
            .replaceAll("\u0009", "\t");
          req.body.desc = indent(req.body.desc);
          bot.desc = coronaSanitizer(req.body.desc, {
            allowedTags: coronaSanitizer.defaults.allowedTags.concat([
              "discord-message",
              "discord-messages",
              "img",
              "iframe",
              "style",
              "h1",
              "h2",
              "link",
              "mark",
              "svg",
              "span",
            ]),
            allowVulnerableTags: true,
            allowedAttributes: {
              "*": ["*"],
            },
          });
        }
      }
    }
    if (!err && req.body.short) {
      if (!err && req.body.short !== bot.short) {
        if (req.body.short.length < 11) err = "invalid_short";
        if (!err && req.body.short.length > 150) {
          req.body.short = req.body.short.slice(0, 147) + "...";
        }
        bot.short = req.body.short;
      }
    }
    if (!err && req.body.support) {
      if (req.body.support !== bot.support) {
        req.body.support = req.body.support.replace("discord.gg", "");
        req.body.support.replace("https://", "");
        if (req.body.support !== "") {
          fetch(`https://discord.com/api/v7/invites/${req.body.support}`)
            .then((r) => r.json())
            .then((d) => {
              if (d.code == 10006 || d.code == 0 || d.code != req.body.support)
                err = "invalid_support";
            });
        } else bot.support = req.body.support == "" ? null : req.body.support;
      }
    }
    if (!err && req.body.lib) {
      if (req.body !== bot.lib) {
        if (req.body.lib.length > 11) err = "invalid_lib";
        else bot.lib = req.body.lib;
      }
    }
    if (!err && req.body.invite) {
      if (req.body.invite !== bot.invite) {
        if (!validator.isURL(req.body.invite)) err = "invalid_invite";
        else bot.invite = req.body.invite;
      }
    }
    if (!err && req.body.prefix) {
      if (req.body.prefix !== bot.prefix) {
        bot.prefix = req.body.prefix;
      }
    }
    if (!err && req.body.bg) {
      if (req.body.bg !== bot.bg) {
        if (!validator.isURL(req.body.bg)) err = "invalid_bg";
        else bot.bg = req.body.bg == "" ? null : req.body.bg;
      }
    }
    if (!err && req.body.github) {
      if (req.body.github !== bot.github) {
        if (!req.body.github.match(gitregex)) err = "invalid_github";
        else bot.github = req.body.github == "" ? null : req.body.github;
      }
    }
    if (!err) {
      await bot.save();
      await res.json(bot);
    } else {
      res.json({ err });
    }
  });
});
router.post("/new", async (req, res) => {
  var err;
  Cache.Bots.findOne({ id: req.body.id }).then(async (result) => {
    if (typeof result == "object")
      return res.json({ err: "bot_already_added" });
    else {
      if (!err) {
        if (req.body.github == "") req.body.github = null;
        if (req.body.bg == "") req.body.bg = null;
        if (req.body.support == "") req.body.support = null;
        if (req.body.donate == "") req.body.donate = null;
      }
      if (!err && !result) {
        try {
          if (!err && !req.body.id) err = "no_id";
          fetch(`https://discord.com/api/v10/users/${req.body.id}`, {
            headers: {
              Authorization: `Bot ${Deno.env.get("TOKEN")}`,
            },
          })
            .then((r) => r.json())
            .then(async (user) => {
              if (!err && user.bot == undefined) err = "cannot_add_user";
              if (!err && user.username.toLowerCase().includes("hack"))
                err = "cannot_add_hacked_bot";
              if (!err && user.username.toLowerCase().includes("deleted"))
                err = "cannot_add_deleted_bot";
              if (!err && user.code == 10013) err = "cannot_add_invalid_user";
              if (!err && req.body.bg) {
                if (!validator.isURL(req.body.bg)) err = "invalid_bg";
              }
              if (!err && (!req.body.owners || req.body.owners?.length == 0))
                err = "no_owners";
              if (req.body.owners) {
                req.body.owners = [...new Set(req.body.owners)];
              }
              if (!err && !req.body.short) err = "no_short";
              if (!err && req.body.short.length < 11) err = "invalid_short";
              if (!err && req.body.short.length > 150) {
                req.body.short = req.body.short.slice(0, 147) + "...";
              }
              if (!err && req.body.webhook) {
                if (!validator.isURL(req.body.webhook)) err = "invalid_webhook";
              }
              if (!err && !validator.isURL(req.body.invite))
                err = "invalid_invite";
              if (!err && req.body.donate) {
                if (!validator.isURL(req.body.donate)) err = "invalid_donate";
              }
              if (!err && !req.body.desc) err = "no_desc";
              if (!err && !req.body.lib) err = "no_lib";
              if (!err && req.body.lib.length > 11) err = "invalid_lib";
              if (!err && req.body.desc.length < 100) err = "invalid_desc";
              if (!err && !req.body.prefix) err = "no_prefix";
              if (!err && !req.body.invite) err = "no_invite";
              if (!err && req.body.support) {
                req.body.support = req.body.support.replace("discord.gg/", "");
                req.body.support = req.body.support.replace(
                  "discord.com/invite/",
                  ""
                );
                req.body.support = req.body.support.replace("https://", "");
                if (!err) {
                  fetch(
                    `https://discord.com/api/v7/invites/${req.body.support}`
                  )
                    .then((r) => r.json())
                    .then((d) => {
                      if (
                        d.code == 10006 ||
                        d.code == 0 ||
                        d.code != req.body.support
                      )
                        err = "invalid_support";
                    });
                }
                if (!err && req.body.support.length >= 18)
                  err: "invalid_support";
              }
              if (!err && req.body.github) {
                if (!req.body.github.startsWith("https://"))
                  err = "invalid_github";
              }
              if (!err && req.body.desc) {
                req.body.desc = req.body.desc
                  .replaceAll("\r\n", "\n")
                  .replaceAll("\u0009", "\t")
                req.body.desc = indent(req.body.desc);
                req.body.desc = coronaSanitizer(req.body.desc, {
                  allowedTags: coronaSanitizer.defaults.allowedTags.concat([
                    "discord-message",
                    "discord-messages",
                    "img",
                    "iframe",
                    "style",
                    "h1",
                    "h2",
                    "link",
                    "mark",
                  ]),
                  allowVulnerableTags: true,
                  allowedAttributes: {
                    "*": ["*"],
                  },
                });
                req.body.desc = rovel.emoji.emojify(req.body.desc, (name) => {
                  return name;
                });
              }

              fetch(
                `${Deno.env.get("DOMAIN")}/api/client/mainserver/${req.body.owners[0]}`
              )
                .then((r) => r.json())
                .then((d) => {
                  if (!err && !d.condition && !req.body.imported) {
                    err = "owner_not_in_server";
                  }
                });

              if (!err) {
                if (!user.avatar) {
                  user.avatar = (user.discriminator % 5).toString();
                }
                fetch(
                  `${Deno.env.get("DOMAIN")}/api/client/mainserver/${req.body.id}`
                )
                  .then((r) => r.json())
                  .then((dd) => {
                    const bot = new Cache.models.bots({
                      id: req.body.id,
                      webhook: req.body.webhook,
                      username: user.username,
                      discriminator: user.discriminator,
                      avatar: user.avatar,
                      owners: req.body.owners,
                      added: dd.condition,
                      short: req.body.short,
                      desc: req.body.desc,
                      prefix: req.body.prefix,
                      verified: false,
                      lib: req.body.lib,
                      support: req.body.support == "" ? null : req.body.support,
                      bg: req.body.bg ? null : req.body.bg,
                      github: req.body.github == "" ? null : req.body.github,
                      website: req.body.website == "" ? null : req.body.website,
                      donate: req.body.donate == "" ? null : req.body.donate,
                      invite: req.body.invite,
                      code: passgen()
                    }).save((err, bot) => {
                      if (err) {
                        console.log("err" + err);
                        return res.send({ err: err.stack || err });
                      }
                      if (!err) {
                        Cache.AllBots.push(bot);
                        let role = privatebot.guilds.cache
                          .get("602906543356379156")
                          .roles.cache.get("889746788024725564");
                        bot.owners.forEach((meme) => {
                          member = privatebot.guilds.cache
                            .get("602906543356379156")
                            .members.cache.get(meme);
                          member?.roles
                            ?.add(role)
                            ?.catch((e) => console.log(e));
                        });
                        res.send({ success: true });
                        fetch(`${Deno.env.get("DOMAIN")}/api/client/log`, {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            secret: Deno.env.get("SECRET"),
                            img: bot.avatarURL,
                            desc: `**${user.username}** has been ${!bot.imported
                              ? "added"
                              : `imported from ${bot.imported},`
                              } by ${"<@!" + bot.owners[0] + ">"
                              }\nInfo:\n\`\`\`\n${bot.short}\n\`\`\`${dd.condition == true
                                ? "\nThe bot has been already added to the server, so they are saved as 'added'"
                                : ""
                              }`,
                            title: `New Bot Added!`,
                            color: "#31CB00",
                            owners: bot.owners,
                            url: `${Deno.env.get("DOMAIN")}/bots/${bot.id}`,
                          }),
                        });
                      }
                    });
                  });
              }
              if (err) {
                res.json({ err });
              }
            });
        } catch (e) {
          res.json({ err: e.stack || e });
          console.error("error: " + e.stack);
        }
      }
    }
  });
});

export default router;
