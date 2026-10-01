// app/manifest.ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: "Check-in Event",
        short_name: "Check-in",
        description: "Sistem pendataan peserta event",
        start_url: "/checkin",
        display: "standalone",
        orientation: "portrait",
        background_color: "#020617",
        theme_color: "#0f172a",
        icons: [
            { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
            { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
    };
}