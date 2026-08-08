import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { handleAiProxyRequest } from "./ai-proxy-handler.mjs";

const port = Number(process.env.PORT || 8787);
const apiKey = process.env.DASHSCOPE_API_KEY?.trim();
const allowedOrigin = process.env.ALLOWED_ORIGIN?.trim() || "";
const distDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../dist");
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2"
};

function serveStatic(request, response) {
  const requestPath = decodeURIComponent((request.url || "/").split("?")[0]);
  const relativePath = requestPath === "/" ? "index.html" : requestPath.replace(/^\/+/, "");
  const requestedFile = path.resolve(distDirectory, relativePath);
  const safePath = requestedFile.startsWith(`${distDirectory}${path.sep}`) ? requestedFile : "";

  if (safePath && fs.existsSync(safePath) && fs.statSync(safePath).isFile()) {
    response.statusCode = 200;
    response.setHeader("Content-Type", contentTypes[path.extname(safePath)] || "application/octet-stream");
    fs.createReadStream(safePath).pipe(response);
    return;
  }

  const indexFile = path.join(distDirectory, "index.html");
  if (!fs.existsSync(indexFile)) {
    response.statusCode = 503;
    response.end("Frontend build not found. Run pnpm build first.");
    return;
  }

  response.statusCode = 200;
  response.setHeader("Content-Type", contentTypes[".html"]);
  fs.createReadStream(indexFile).pipe(response);
}

const server = http.createServer(async (request, response) => {
  const handled = await handleAiProxyRequest(request, response, { apiKey, allowedOrigin });
  if (!handled && !response.headersSent) {
    serveStatic(request, response);
  }
});

server.listen(port, () => {
  console.log(`Find & Decide listening on http://localhost:${port}`);
});
