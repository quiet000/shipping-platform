import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-almarai)", "system-ui", "sans-serif"],
      },
      colors: {
        navy: {
          50: "#f0f5fa",
          100: "#dce7f3",
          200: "#b9cfe7",
          300: "#8dafd4",
          400: "#5c8abd",
          500: "#3a6ea5",
          600: "#2b5688",
          700: "#24456e",
          800: "#1f3a5c",
          900: "#1E293B",
          950: "#0F172A",
        },
        accent: {
          DEFAULT: "#0369A1",
          light: "#0ea5e9",
          soft: "#38BDF8",
          dark: "#075985",
        },
        success: "#22C55E",
        warning: "#f59e0b",
        danger: "#EF4444",
        info: "#0EA5E9",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
      },
    },
  },
  plugins: [],
};

export default config;
