export default function (req, res, next) {
  if (!globalThis.started) {
    console.log("[WAITING] Booting: " + process.uptime());
    if (
      req.originalUrl.startsWith("/assets") ||
      req.originalUrl.startsWith("/api")
    )
      next();
    else res.sendFile(path.resolve("src/public/assets/loading.html"));
  } else next();
};
