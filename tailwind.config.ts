import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "hsl(210 20% 98%)",
        foreground: "hsl(220 20% 12%)",
        muted: "hsl(210 16% 94%)",
        border: "hsl(215 18% 84%)",
        primary: "hsl(215 60% 38%)",
        accent: "hsl(24 90% 50%)"
      },
      boxShadow: {
        panel: "0 8px 30px rgba(15, 23, 42, 0.08)"
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0" },
          to: { opacity: "1" }
        },
        slideUp: {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        }
      },
      animation: {
        fadeIn: "fadeIn 220ms ease-out",
        slideUp: "slideUp 280ms ease-out"
      }
    }
  },
  plugins: []
};

export default config;
