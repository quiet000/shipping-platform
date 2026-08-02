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
        sans: ["var(--font-cairo)", "system-ui", "sans-serif"],
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
          DEFAULT: "#F59E0B",
          light: "#fbbf24",
          dark: "#d97706",
        },
        success: "#16a34a",
        warning: "#f59e0b",
        danger: "#dc2626",
        info: "#2563EB",
      },
      boxShadow: {
        card: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
      },
    },
  },
  plugins: [],
};

export default config;
