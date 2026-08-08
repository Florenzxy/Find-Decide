import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

declare const process: {
  cwd: () => string;
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiKey = env.DASHSCOPE_API_KEY || env.VITE_DASHSCOPE_API_KEY;

  return {
    plugins: [react()],
    server: {
      proxy: {
        "/api/ai": {
          target: "https://dashscope.aliyuncs.com",
          changeOrigin: true,
          headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
          rewrite: (path) => path.replace(/^\/api\/ai/, "/compatible-mode/v1"),
          configure: (proxy) => {
            proxy.on("proxyReq", (proxyReq) => {
              if (apiKey) {
                proxyReq.removeHeader("authorization");
                proxyReq.setHeader("authorization", `Bearer ${apiKey}`);
              }
            });
          }
        }
      }
    }
  };
});
