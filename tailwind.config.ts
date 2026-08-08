import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17201a",
        moss: "#3f5d4a",
        coral: "#d8705f",
        amber: "#c18a2c",
        paper: "#f7f4ed"
      },
      boxShadow: {
        soft: "0 12px 32px rgba(23, 32, 26, 0.08)"
      }
    }
  },
  plugins: []
} satisfies Config;
