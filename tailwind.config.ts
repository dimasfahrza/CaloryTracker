import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1rem", screens: { "2xl": "1280px" } },
    extend: {
      colors: {
        bg: "#0B0F0E",
        surface: "#11161A",
        surface2: "#161C22",
        border: "#1F2730",
        muted: "#8A95A1",
        text: "#E7ECEF",
        primary: { DEFAULT: "#22C55E", soft: "#16A34A", ring: "#86EFAC" },
        accent: "#F59E0B",
        danger: "#EF4444",
        protein: "#60A5FA",
        carbs: "#F59E0B",
        fat: "#F472B6",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      borderRadius: { xl: "14px", "2xl": "20px" },
      boxShadow: {
        card: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 8px 24px rgba(0,0,0,0.25)",
      },
    },
  },
  plugins: [],
};
export default config;
