const API_CACHE = "neopancreas-api-cache"

// Cache HTML
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(API_CACHE).then((cache) => {
            return cache.addAll([
                "/",
                "/src/styles/Alerts.css",
                "/src/styles/BasalAndBolus.css",
                "/src/styles/Dashboard.css",
                "/src/styles/Form.css",
                "/src/styles/GlucoseReading.css",
                "/src/styles/LoadingIndicator.css",
                "/src/styles/Modals.css",
                "/favicon.ico",
            ])
        })
    )
})

// Fetch cached HTML
self.addEventListener("fetch", (event) => {
    event.respondWith(
        fetch(event.request).catch(() =>
            caches
                .match(event.request)
                .then((response) => response
        ))
    )
})

// Handle API caching
self.addEventListener("fetch", (event) => {
    const { request } = event

    if (request.url.includes("/api/glucose-readings")) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    // Clone response & store it
                    const clonedResponse = response.clone()
                    caches.open(API_CACHE).then((cache) => {
                        cache.put(request, clonedResponse)
                    })
                    return response
                })
                .catch(() => {
                    // If offline, serve cached API response
                    return caches.match(request).then((cachedResponse) => {
                        return (
                            cachedResponse ||
                            new Response("[]", {
                                headers: { "Content-Type": "application/json" },
                            })
                        )
                    })
                })
        )
    } else {
        event.respondWith(fetch(request).catch(() => caches.match(request)))
    }
})
