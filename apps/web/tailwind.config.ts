import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/features/**/*.{ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1B1F2B",
        ocean: "#0B5B7A",
        sand: "#F4EFE6",
        tide: "#58A6C7",
        mint: "#C7F2D6",
        coral: "#FF7A59"
      }
    }
  },
  plugins: []
};

export default config;
