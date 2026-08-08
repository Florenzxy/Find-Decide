import http from "node:http";
import { handleAiProxyRequest } from "./ai-proxy-handler.mjs";

const port = Number(process.env.PORT || 8787);
const apiKey = process.env.DASHSCOPE_API_KEY?.trim();
const allowedOrigin = process.env.ALLOWED_ORIGIN?.trim() || "";

const server = http.createServer(async (request, response) => {
  const handled = await handleAiProxyRequest(request, response, { apiKey, allowedOrigin });
  if (!handled && !response.headersSent) {
    response.statusCode = 404;
    response.end("Not found.");
  }
});

server.listen(port, () => {
  console.log(`AI proxy listening on http://localhost:${port}`);
});
