self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open("my-cache").then((cache) => {
            return cache.addAll([
                "/",
                "/login",
                "/register",
                "/dashboard",
                "/api/token/",
                "/api/token/refresh/",
                "/api/start-simulation/",
                "/api/stop-simulation/",
                "/api/simulation-status/",
                "/api/glucose-readings/",
                "/api/user-profile/",
                "/api/user/",
                "/api/toggle-em/",
                "/api/sensor-settings/",
                "/api/pump-settings/",
                "/api/inject-bolus/",
            ])
        })
    )
})

self.addEventListener("fetch", (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            return response || fetch(event.request)
        })
    )
})
