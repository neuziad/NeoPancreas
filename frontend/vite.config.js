import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import mkcert from "vite-plugin-mkcert"
import tailwindcss from "@tailwindcss/vite"

// https://vite.dev/config/
export default defineConfig({
    minify: "esbuild", // Minify code
    tersetOptions: {
        compress: {
            drop_console: true,  // Remove console log for increased performance
            unused: true  // Remove unused code for increased performance
        }
    },
    plugins: [react(), mkcert(), tailwindcss()],
    base: "./",
})
