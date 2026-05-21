const CACHE_NAME = "mantra-player-v1";
const APP_ASSETS = [
    "./",
    "./index.html",
    "./style.css",
    "./script.js",
    "./manifest.webmanifest",
    "./icon.svg",
    "./mantra.wav"
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then((cache) => cache.addAll(APP_ASSETS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((cacheNames) => Promise.all(
                cacheNames
                    .filter((cacheName) => cacheName !== CACHE_NAME)
                    .map((cacheName) => caches.delete(cacheName))
            ))
            .then(() => self.clients.claim())
    );
});

async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
        return cachedResponse;
    }

    const response = await fetch(request);

    if (response && response.ok) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
    }

    return response;
}

async function rangeResponse(request) {
    const cachedResponse = await caches.match(request.url);

    if (!cachedResponse) {
        return fetch(request);
    }

    const rangeHeader = request.headers.get("range") || "";
    const rangeMatch = rangeHeader.match(/^bytes=(\d+)-(\d*)$/);

    if (!rangeMatch) {
        return cachedResponse;
    }

    const blob = await cachedResponse.blob();
    const start = Number(rangeMatch[1]);
    const requestedEnd = rangeMatch[2] ? Number(rangeMatch[2]) : blob.size - 1;
    const end = Math.min(requestedEnd, blob.size - 1);

    if (start >= blob.size || start > end) {
        return new Response(null, {
            status: 416,
            statusText: "Range Not Satisfiable",
            headers: {
                "Content-Range": `bytes */${blob.size}`
            }
        });
    }

    const chunk = blob.slice(start, end + 1);

    return new Response(chunk, {
        status: 206,
        statusText: "Partial Content",
        headers: {
            "Accept-Ranges": "bytes",
            "Content-Length": String(chunk.size),
            "Content-Range": `bytes ${start}-${end}/${blob.size}`,
            "Content-Type": cachedResponse.headers.get("Content-Type") || "audio/wav"
        }
    });
}

self.addEventListener("fetch", (event) => {
    const { request } = event;

    if (request.method !== "GET") {
        return;
    }

    const requestUrl = new URL(request.url);

    if (requestUrl.origin !== self.location.origin) {
        return;
    }

    if (request.headers.has("range")) {
        event.respondWith(rangeResponse(request));
        return;
    }

    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request).catch(() => caches.match("./index.html"))
        );
        return;
    }

    event.respondWith(cacheFirst(request));
});
