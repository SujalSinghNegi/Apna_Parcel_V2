import type { Config } from "tailwindcss";
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff7ed", 100: "#ffedd5", 200: "#fed7aa",
          300: "#fdba74", 400: "#fb923c", 500: "#FF6B35",
          600: "#ea580c", 700: "#c2410c", 800: "#9a3412", 900: "#7c2d12",
        },
        navy: {
          50: "#f0f4f8", 100: "#d9e2ec", 200: "#bcccdc",
          300: "#9fb3c8", 400: "#829ab1", 500: "#627d98",
          600: "#486581", 700: "#334e68", 800: "#243b53", 900: "#1E3A5F",
        },
      },
      fontFamily: { sans: ["Inter", "sans-serif"] },
    },
  },
  plugins: [],
};
export default config;
