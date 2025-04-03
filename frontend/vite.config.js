import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import mkcert from "vite-plugin-mkcert"
import tailwindcss from "@tailwindcss/vite"
import { VitePWA } from "vite-plugin-pwa"

// https://vite.dev/config/
export default defineConfig({
    minify: "esbuild", // Minify code
    terserOptions: {
        compress: {
            drop_console: true, // Remove console log for increased performance
            unused: true, // Remove unused code for increased performance
        },
    },
    chunkSizeWarningLimit: 4000,
    plugins: [
        react(),
        mkcert(),
        tailwindcss(),
        VitePWA({
            registerType: "prompt",
            injectRegister: "auto",
            includeAssets: [
                "**/*", // Cache all assets in the public folder
            ],
            manifest: {
                name: "NeoPancreas",
                short_name: "NeoPancreas",
                description:
                    "A web-based artificial pancreas system for diabetic patients.",
                start_url: "/",
                display: "standalone",
                background_color: "#fcfffe",
                theme_color: "#fcfffe",
                lang: "en",
                scope: "/",
                orientation: "landscape-primary",
                icons: [
                    {
                        src: "/apple-icon-180.png",
                        sizes: "180x180",
                        type: "image/png",
                    },
                    {
                        src: "/manifest-icon-144.png",
                        sizes: "144x144",
                        type: "image/png",
                        purpose: "any",
                    },
                    {
                        src: "/manifest-icon-192.png",
                        sizes: "192x192",
                        type: "image/png",
                        purpose: "any",
                    },
                    {
                        src: "/manifest-icon-512.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "any",
                    },
                ],
                screenshots: [
                    {
                        src: "/screenshot.png",
                        sizes: "1920x945",
                        type: "image/png",
                        form_factor: "wide",
                    },
                    {
                        src: "/screenshot_m.png",
                        sizes: "425x858",
                        type: "image/png",
                        form_factor: "narrow",
                    },
                ],
            },
            workbox: {
                navigateFallback: "/index.html",
            },
            devOptions: {
                enabled: true,
                type: "module",
            },
        }),
    ],
    server: {
        headers: {
            "Content-Type": "application/manifest+json",
        },
    },
    base: "./",
})
