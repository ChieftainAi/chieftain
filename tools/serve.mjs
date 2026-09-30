// Dev server for Chieftain. No dependencies.
//
// Exists because `python -m http.server` sends no cache headers at all, so browsers fall back
// to heuristic caching and keep serving yesterday's main.js out of memory. That failure is
// invisible and looks exactly like the app being broken: an open tab keeps the old router, a
// new route silently redirects to the hub, and the new nav item is missing. This sends
// `Cache-Control: no-store` on everything, so a reload always gets the current build.
//
//   node tools/serve.mjs [port]        default 8777, serving ./src
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize, sep } from "node:path";

const PORT = Number(process.argv[2] || 8777);
const ROOT = join(process.cwd(), "src");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js":   "text/javascript; charset=utf-8",
  ".css":  "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg":  "image/svg+xml",
  ".png":  "image/png",
  ".jpg":  "image/jpeg",
  ".woff2": "font/woff2",
  ".ico":  "image/x-icon",
};

const server = createServer(async (req, res) => {
  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  // Contain the path inside ROOT: a request for /../../secrets must not escape the publish dir.
  const rel = normalize(urlPath).replace(/^([/\\])+/, "");
  if (rel.split(sep).includes("..")) {
    res.writeHead(403).end("Forbidden");
    return;
  }
  let file = join(ROOT, rel || "index.html");

  try {
    const s = await stat(file);
    if (s.isDirectory()) file = join(file, "index.html");
  } catch {
    // Unknown path: this is a hash-routed SPA, so fall back to the shell the way netlify.toml
    // does in production rather than returning a 404 the router never sees.
    file = join(ROOT, "index.html");
  }

  try {
    const body = await readFile(file);
    res.writeHead(200, {
      "Content-Type": TYPES[extname(file).toLowerCase()] || "application/octet-stream",
      "Cache-Control": "no-store, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    });
    res.end(body);
  } catch (e) {
    res.writeHead(404, { "Content-Type": "text/plain" }).end("Not found");
  }
});

server.listen(PORT, () => {
  console.log(`Chieftain dev server on http://localhost:${PORT}  (serving ${ROOT}, no-store)`);
});
