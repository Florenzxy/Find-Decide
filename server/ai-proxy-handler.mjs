import https from "node:https";

const targetPath = "/compatible-mode/v1/chat/completions";

function writeJson(response, statusCode, body) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body));
}

function setCorsHeaders(response, allowedOrigin) {
  if (!allowedOrigin) return;
  response.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  response.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  response.setHeader("Vary", "Origin");
}

function readRequestBody(request, response) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > 2 * 1024 * 1024) {
        writeJson(response, 413, { error: { message: "Request body is too large." } });
        request.destroy();
        reject(new Error("Request body is too large."));
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

export async function handleAiProxyRequest(request, response, options = {}) {
  const apiKey = options.apiKey?.trim();
  const allowedOrigin = options.allowedOrigin?.trim() || "";

  setCorsHeaders(response, allowedOrigin);

  if (request.method === "OPTIONS") {
    response.statusCode = 204;
    response.end();
    return true;
  }

  if (request.method !== "POST" || request.url !== "/api/ai/chat/completions") {
    return false;
  }

  if (!apiKey) {
    writeJson(response, 500, { error: { message: "DASHSCOPE_API_KEY is not configured." } });
    return true;
  }

  try {
    const body = await readRequestBody(request, response);
    const upstream = https.request(
      {
        hostname: "dashscope.aliyuncs.com",
        path: targetPath,
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": request.headers["content-type"] || "application/json",
          "Content-Length": body.length
        }
      },
      (upstreamResponse) => {
        response.statusCode = upstreamResponse.statusCode || 502;
        response.setHeader("Content-Type", upstreamResponse.headers["content-type"] || "application/json");
        upstreamResponse.pipe(response);
      }
    );

    upstream.on("error", (error) => {
      if (!response.headersSent) {
        writeJson(response, 502, { error: { message: "Upstream AI request failed.", detail: error.message } });
      }
    });
    upstream.end(body);
  } catch (error) {
    if (!response.headersSent) {
      writeJson(response, 400, { error: { message: error instanceof Error ? error.message : "Invalid request." } });
    }
  }

  return true;
}
