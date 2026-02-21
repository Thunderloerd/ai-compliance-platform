import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        danger: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        success: {
          DEFAULT: "var(--success)",
          foreground: "var(--success-foreground)",
        },
        highlight: {
          DEFAULT: "var(--highlight)",
          foreground: "var(--highlight-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        chart: {
          1: "var(--chart-1)",
          2: "var(--chart-2)",
          3: "var(--chart-3)",
          4: "var(--chart-4)",
          5: "var(--chart-5)",
        },
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1rem", letterSpacing: "0.01em" }],
        sm: ["0.875rem", { lineHeight: "1.25rem", letterSpacing: "0.01em" }],
        base: ["1rem", { lineHeight: "1.5rem", letterSpacing: "0" }],
        lg: ["1.125rem", { lineHeight: "1.75rem", letterSpacing: "-0.01em" }],
        xl: ["1.25rem", { lineHeight: "1.75rem", letterSpacing: "-0.01em" }],
        "2xl": ["1.5rem", { lineHeight: "2rem", letterSpacing: "-0.02em" }],
        "3xl": ["1.875rem", { lineHeight: "2.25rem", letterSpacing: "-0.02em" }],
        "heading-1": ["1.875rem", { lineHeight: "2.25rem", letterSpacing: "-0.02em" }],
        "heading-2": ["1.5rem", { lineHeight: "2rem", letterSpacing: "-0.02em" }],
        "heading-3": ["1.25rem", { lineHeight: "1.75rem", letterSpacing: "-0.01em" }],
        subheading: ["1.125rem", { lineHeight: "1.75rem", letterSpacing: "-0.01em" }],
        label: ["0.875rem", { lineHeight: "1.25rem", letterSpacing: "0.01em" }],
        caption: ["0.75rem", { lineHeight: "1rem", letterSpacing: "0.01em" }],
      },
      spacing: {
        page: "1.5rem",
        section: "2rem",
        card: "1.5rem",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-accent": "linear-gradient(135deg, var(--primary) 0%, #14b8a6 100%)",
        "gradient-primary": "linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)",
        "gradient-mesh": "radial-gradient(at 40% 20%, rgba(13, 148, 136, 0.22) 0px, transparent 50%), radial-gradient(at 85% 0%, rgba(232, 93, 4, 0.14) 0px, transparent 50%), radial-gradient(at 0% 60%, rgba(13, 148, 136, 0.08) 0px, transparent 45%)",
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.37)",
        "glass-sm": "0 4px 16px 0 rgba(0, 0, 0, 0.25)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
        xl: "var(--shadow-xl)",
        glow: "var(--shadow-glow)",
        "glow-primary": "0 0 28px rgba(15, 118, 110, 0.28)",
      },
      backdropBlur: {
        xs: "2px",
      },
      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
        '250': '250ms',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      animation: {
        "fade-in": "fadeIn 200ms ease-out",
        "slide-in": "slideIn 200ms ease-out",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
        "shimmer": "shimmer 2s ease-in-out infinite",
        "float": "float 4s ease-in-out infinite",
        "shine": "shine 3s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideIn: {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-4px)" },
        },
        shine: {
          "0%": { backgroundPosition: "-120% 0" },
          "100%": { backgroundPosition: "120% 0" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
