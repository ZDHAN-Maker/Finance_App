/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Palet Maroon elegan (selaras dengan D'GYM) — kertas hangat rose, tinta crimson maroon, aksen rust
        paper: {
          DEFAULT: "#FAF5F6",
          card: "#FFFFFF",
          line: "#EADBDD",
        },
        ink: {
          DEFAULT: "#1A0A0F",
          soft: "#4F3B42",
          faint: "#8A787E",
        },
        ledger: {
          50: "#FFF1F2",
          100: "#FFE4E6",
          200: "#FECDD3",
          300: "#FDA4AF",
          400: "#E11D48",
          500: "#9F1239",
          600: "#881337",
          700: "#6B0E2A",
          900: "#4C0519",
        },
        maroon: {
          50: "#FFF1F2",
          100: "#FFE4E6",
          200: "#FECDD3",
          300: "#FDA4AF",
          400: "#E11D48",
          500: "#9F1239",
          600: "#881337",
          700: "#6B0E2A",
          900: "#4C0519",
        },
        rust: {
          50: "#F7E9E1",
          400: "#C15A31",
          500: "#B3441F",
          600: "#8F3417",
        },
        gold: {
          400: "#C99A2E",
        },
      },
      fontFamily: {
        display: ["Fraunces", "ui-serif", "Georgia", "serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      borderRadius: {
        card: "14px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(22, 34, 28, 0.06), 0 1px 1px rgba(22, 34, 28, 0.04)",
      },
      backgroundImage: {
        // Tekstur titik dekoratif (dipakai di tulang punggung kartu saldo) —
        // memakai warna putih transparan supaya tetap aman di atas warna apa pun.
        "perforation": "radial-gradient(circle, rgba(255,255,255,0.35) 2.2px, transparent 2.3px)",
      },
      backgroundSize: {
        "perforation": "14px 14px",
      },
    },
  },
  plugins: [],
};
