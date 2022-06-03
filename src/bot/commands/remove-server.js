if (message.author.id === message.guild.ownerId) {
  Cache.models.servers.findOne({ id: message.guild.id }).then((server) => {
    if (server) {
      fetch("https://discord.rovelstars.com/api/client/log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          secret: process.env.SECRET,
          desc: `Server ${server.name} has been deleted by <@!${
            message.author.id
          }>\nThe data deleted is:\n\`\`\`\n${JSON.stringify(
            server
          )}\n\`\`\`\nIncase it was deleted accidentally, the above data may be added back again manually if the server is added back to RDL`,
          title: "Server Deleted!",
          color: "#ff0000",
          owners: message.author.id,
          img: server.iconURL,
          url: `https://discord.rovelstars.com/`,
        }),
      });
      Cache.models.servers.deleteOne({ id: message.guild.id }, () => {});
      message.reply({ content: "<:pokisad:799907571812401172> Done.." });
    } else
      message.reply({
        content: "Oi! This server has been already deleted/not added.",
      });
  });
} else {
  message.reply({
    content:
      "Oi! This server can be removed only by the owner for security purposes.",
  });
}
