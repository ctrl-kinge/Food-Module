import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Midnight Appetite: saffron accent scale, tuned for the dark
        // canvas. Low steps are dark tint surfaces (badge/pill bgs),
        // mid steps are the accent itself, high steps brighten for
        // hover states — "brighten on hover" is the dark-UI idiom.
        brand: {
          50: "#2a2315",
          100: "#332b1a",
          200: "#57451f",
          300: "#8a6c2c",
          400: "#c99333",
          500: "#e8b04b",
          600: "#e8b04b",
          700: "#f0c06a",
          800: "#f5d08a",
          900: "#f9e6c0",
        },
        surface: {
          DEFAULT: "#1d1b18",
          deep: "#131210",
          raised: "#26231f",
          border: "#2e2a24",
        },
        ink: {
          DEFAULT: "#f5f1e8",
          secondary: "#b3ac9e",
          muted: "#8a857a",
          faint: "#6e6a60",
        },
        status: {
          green: "#6fbf8f",
          red: "#e06c5a",
        },
      },
    },
  },
  plugins: [],
};
export default config;
