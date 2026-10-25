import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Saat "npm run dev", request ke /api diteruskan ke live Vercel API
      // atau ke process.env.VITE_API_URL jika ingin menggunakan serverless lokal (port 3000).
      "/api": {
        target:
          process.env.VITE_API_URL ||
          "https://finance-bv1flxygd-dhandans-projects.vercel.app",
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on("error", (_err, _req, res) => {
            if (res && "writeHead" in res) {
              const resp = res as { headersSent?: boolean; writeHead: (code: number, headers: Record<string, string>) => void; end: (body: string) => void };
              if (!resp.headersSent) {
                resp.writeHead(502, { "Content-Type": "application/json" });
                resp.end(
                  JSON.stringify({
                    error: "BadGateway",
                    message:
                      "Tidak dapat terhubung ke server API. Periksa koneksi atau jalankan 'npx vercel dev'.",
                  })
                );
              }
            }
          });
        },
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
      },
    },
  },
});
