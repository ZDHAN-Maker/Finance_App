/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Palet "buku kas" — kertas hangat, tinta hijau ledger, aksen rust
        // untuk pengeluaran. Sengaja dijaga tetap kecil (5 warna inti).
        paper: {
          DEFAULT: "#F5F6F0",
          card: "#FFFFFF",
          line: "#E1DED0",
        },
        ink: {
          DEFAULT: "#16221C",
          soft: "#4B5A50",
          faint: "#8B9389",
        },
        ledger: {
          50: "#E7F2EC",
          100: "#C7E2D2",
          400: "#2F8F5E",
          500: "#1F6E4A",
          600: "#175939",
          900: "#123B28",
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
