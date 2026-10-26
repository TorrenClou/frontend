import type { Config } from "tailwindcss"

const config = {
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        // Base colors
        dark: "#000000",
        light: "#ffffff",

        // Primary colors (teal)
        primary: {
          DEFAULT: "#128775",
          50: "#a1c9bf",
          100: "#89bcb0",
          200: "#71afa1",
          300: "#58a192",
          400: "#3c9483",
          500: "#128775",
          600: "#0f6d5f",
          700: "#0c5349",
          800: "#083933",
          900: "#041f1d",
        },

        // Surface colors (neutral grays)
        surface: {
          DEFAULT: "#121212",
          50: "#8b8b8b",
          100: "#717171",
          200: "#575757",
          300: "#3f3f3f",
          400: "#282828",
          500: "#121212",
        },

        // Surface tonal (tinted grays)
        "surface-tonal": {
          DEFAULT: "#161d1b",
          50: "#8e9190",
          100: "#737877",
          200: "#5a605e",
          300: "#424846",
          400: "#2b3230",
          500: "#161d1b",
        },

        // Success colors
        success: {
          DEFAULT: "#22946e",
          light: "#9ae8ce",
          medium: "#47d5a6",
          dark: "#22946e",
        },

        // Warning colors
        warning: {
          DEFAULT: "#a87a2a",
          light: "#ecd7b2",
          medium: "#d7ac61",
          dark: "#a87a2a",
        },

        // Danger colors
        danger: {
          DEFAULT: "#9c2121",
          light: "#eb9e9e",
          medium: "#d94a4a",
          dark: "#9c2121",
        },

        // Info colors
        info: {
          DEFAULT: "#21498a",
          light: "#92b2e5",
          medium: "#4077d1",
          dark: "#21498a",
        },

        // Semantic color mappings for shadcn/ui
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      transitionTimingFunction: {
        "out-quart": "cubic-bezier(0.165, 0.84, 0.44, 1)",
        "out-quint": "cubic-bezier(0.22, 1, 0.36, 1)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pulse-slow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-slow": "pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "shimmer": "shimmer 2s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config

export default config
