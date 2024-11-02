import { Router } from "express";
const router = Router();
import { fetch } from "rovel.js";
import auth from "../../utils/auth.js";
import validate from "validator";
router.use((await import("express")).json());

router.get("/", async (req, res) => {
  try {
    const key = await auth.getAccess(req.query.code);
    const raw = await auth.raw(key);
    const user = await auth.getUser(key).catch((e) => {
      console.log(e.stack);
      return res.redirect("/logout");
    });
    console.log(user.tag);
    if (BannedList.includes(user.id)) {
      try {
        Cache.Users.deleteOne({ id: user.id });
      } catch (e) { }
    }
    if (!BannedList.includes(user.id)) {
      Cache.Users.findOne({ id: user.id }).then(async (result) => {
        if (!result) {
          if (raw.scope.includes("guilds.join")) {
            privatebot.guilds.cache
              .get("602906543356379156")
              .members.add(user.id, {
                accessToken: raw.access_token,
                roles: ["889746995034587146", "889756830333558814"],
              });
          }
          if (req.cookies["referral"]) {
            Cache.Users.findOne({ id: req.cookies["referral"] }).then((uuu) => {
              if (uuu) {
                uuu.bal += 100;
                uuu.save();
                fetch(`${process.env.DOMAIN}/api/client/log`, {
                  method: "POST",
                  headers: {
                    "content-type": "application/json",
                  },
                  body: JSON.stringify({
                    secret: process.env.SECRET,
                    title: `Thanks for Referring to ${user.tag} !`,
                    desc: "You received **R$100** for referring them. Thanks for bringing your friends to RDL! Have a nice day!",
                    channel: "private",
                    owners: [uuu.id],
                  }),
                });
              }
              res.cookie("referral", "", { maxAge: 0 });
            });
          }
          const User = new Cache.models.users({
            id: user.id,
            username: user.username,
            discriminator: user.discriminator,
            email: user.emailId || undefined,
            avatar: user.avatarHash ? user.avatarHash : user.discriminator % 5,
          }).save(async (err, userr) => {
            if (err) return console.log(err);
            Cache.Users.refresh();
            fetch(`${process.env.DOMAIN}/api/client/log`, {
              method: "POST",
              headers: {
                "content-type": "application/json",
              },
              body: JSON.stringify({
                secret: process.env.SECRET,
                title: `${userr.tag} account created!`,
                desc: `${userr.tag} (${user.id}) has got a new account automatically on RDL after logining for the first time! So Hey new user **${user.username}**\nWelcome to Rovel Discord List!\nHere you can add your bots, servers, emojis, find your friends, and earn money to vote for your favourite bot!\nSo let's get started on your new journey on RDL!`,
                owners: user.id,
                img: user.avatarUrl(128),
                url: `${process.env.DOMAIN}/users/${user.id}`,
              }),
            });
            res.cookie("key", key, {
              maxAge: 90 * 3600 * 24 * 1000, //90days
              httpOnly: true,
              secure: true,
            });

            if (req.cookies["return"]) {
              try {
                res.cookie("return", req.cookies["return"], { maxAge: 0 });
                res.redirect(req.cookies["return"]);
              } catch (e) { }
            } else {
              res.redirect("/");
            }
          });
        }
        if (result) {
          if (raw.scope.includes("guilds.join")) {
            privatebot.guilds.cache
              .get("602906543356379156")
              .members.add(result.id, {
                accessToken: raw.access_token,
                roles: ["889746995034587146", "889756830333558814"],
              });
          }
          fetch(`${process.env.DOMAIN}/api/client/log`, {
            method: "POST",
            headers: {
              "content-type": "application/json",
            },
            body: JSON.stringify({
              secret: process.env.SECRET,
              title: `${result.tag} logged in!`,
              desc: `Hello ${result.tag}!\nWelcome to RDL!`,
              color: "#1FD816",
              img: user.avatarUrl(128),
              owners: user.id,
            }),
          });
          res.cookie("key", key, {
            maxAge: 90 * 3600 * 24 * 1000, //90days
            httpOnly: true,
            secure: true,
          });
          if (result.email == undefined && user.emailId != undefined) {
            result.email = user.emailId;
            result.save();
          }

          if (result.old) {
            fetch(`${process.env.DOMAIN}/api/client/log`, {
              method: "POST",
              headers: {
                "content-type": "application/json",
              },
              body: JSON.stringify({
                secret: process.env.SECRET,
                title: `${result.tag} Account moved to V2`,
                desc: `${result.tag}, thanks for updating your information to V2!`,
                color: "#1FD816",
                img: user.avatarUrl(128),
                owners: user.id,
              }),
            });
            result.old = false;
          }
          if (result.mfa == undefined) {
            result.mfa = user.ifMFAEnabled;
          }
          if (result.nitro == undefined) {
            result.nitro = user.premiumType == "None" ? 0 : (user.premiumType == "Nitro" ? 2 : 1);
          }
          if (!result.keys.find((a) => a.access_token == raw.access_token)) {
            result.keys.push(raw);
          }
          result.save();
          if (req.cookies["return"]) {
            try {
              res.cookie("return", req.cookies["return"], { maxAge: 0 });
              res.redirect(req.cookies["return"]);
            } catch (e) { }
          } else {
            res.redirect("/");
          }
        }
      });
    } else {
      res.cookie("key", key, {
        maxAge: 90 * 3600 * 24 * 1000, //90days
        httpOnly: true,
        secure: true,
      });

      if (req.cookies["return"]) {
        try {
          res.cookie("return", req.cookies["return"], { maxAge: 0 });
          res.redirect(req.cookies["return"]);
        } catch (e) { }
      } else {
        res.redirect("/");
      }
    }
  } catch (e) {
    res.redirect("/");
    console.log(e);
  }
});
router.get("/key", async (req, res) => {
  res.json({ key: req.cookies["key"] || null });
});

router.get("/email", async (req, res) => {
  if (req.query.email) {
    Users.findOne({ id: req.user.id }).then((user) => {
      if (user == undefined) {
        res.json({ err: "user_not_found" });
      } else {
        if (
          validate.isEmail(req.query.email) ||
          req.query.email == "undefined"
        ) {
          user.email =
            req.query.email == "undefined" ? undefined : req.query.email;
          user.save();
          res.json({ email: user.email });
        } else {
          res.json({ err: "invalid_email" });
        }
      }
    });
  } else {
    Users.findOne({ id: req.user.id }).then((user) => {
      if (user == undefined) {
        res.json({ err: "user_not_found" });
      } else {
        res.json({ email: user.email });
      }
    });
  }
});

router.get("/user", async (req, res) => {
  if (req.query.key || req.cookies["key"]) {
    try {
      const user = await auth
        .getUser(req.query.key || req.cookies["key"])
        .catch((e) => {
          return res.json({ err: "invalid_key" });
        });
      res.json(user);
    } catch {
      res.json({ error: "invalid_key" });
    }
  } else res.json({ error: "no_key" });
});

router.get("/earn", (req, res) => {
  if (publicbot.cooldownearn.has(res.locals?.user?.id)) {
    res.json({ err: "cooldown" });
  } else {
    Users.findOne({ id: res.locals?.user?.id }).then((user) => {
      if (!user) res.json({ err: "not_logged in" });
      else {
        let act = false;
        if (privatebot.isInMain(res.locals?.user?.id)) {
          act = privatebot.guilds.cache
            .get("602906543356379156")
            .members.cache.get(res.locals?.user?.id)
            .presence?.activities?.filter((e) => {
              return (
                e.type == "CUSTOM" &&
                (e?.state?.includes("dscrdly.com") ||
                  e?.state?.includes("discord.rovelstars.com"))
              );
            });
          if (act?.length == 0 || act == undefined) act = false;
          else act = true;
        }
        const c = Math.floor(Math.random() * 10) + 1;
        user.bal += c;
        if (act) user.bal += 10;
        user.save();
        res.json({
          coins: act ? c + 10 : c,
          bal: user.bal,
          lis: act,
          approxbal: rovel.approx(user.bal),
        });
        publicbot.cooldownearn.add(res.locals?.user?.id);
        setTimeout(() => {
          publicbot.cooldownearn.delete(res.locals?.user?.id);
        }, 60000);
      }
    });
  }
});

export default router;
