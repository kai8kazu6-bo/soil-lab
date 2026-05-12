import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // soilラボ ブランドカラー
        beige: {
          DEFAULT: "#F5F2ED", // 背景：温かみのあるベージュ
          50: "#FBFAF7",
          100: "#F5F2ED",
          200: "#EAE3D7",
          300: "#DCD2BF",
        },
        brown: {
          DEFAULT: "#4E342E", // メインテキスト・ボタン：深いブラウン
          50: "#F2EDEC",
          100: "#D7C9C5",
          200: "#A98C85",
          500: "#6D4C45",
          700: "#4E342E",
          900: "#2E1F1B",
        },
        forest: {
          DEFAULT: "#2D5A27", // アクセント：深い森のような緑
          50: "#E8F0E6",
          100: "#C7DBC1",
          400: "#3D7A35",
          500: "#2D5A27",
          700: "#1F3F1B",
        },
      },
      borderRadius: {
        organic: "1.25rem",
      },
      fontFamily: {
        sans: ["'Hiragino Sans'", "'Noto Sans JP'", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 6px 20px -8px rgba(78, 52, 46, 0.18)",
      },
    },
  },
  plugins: [],
};

export default config;
