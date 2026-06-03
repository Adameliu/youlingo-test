const CACHE = "youlingo-v2";
const CACHE_ASSETS = [
  "/",
  "/index.html",
  "/study_app.html",
  "/manifest.json",
  "/favicon.svg",
  "/icon-192.png",
  "/icon-512.png"
];

// Install: cache app shell, skip waiting
self.addEventListener("install", function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return cache.addAll(CACHE_ASSETS);
    }).then(function() {
      return self.skipWaiting();
    }).catch(function(err) {
      console.warn("[SW] App shell caching failed:", err);
    })
  );
});

// Activate: clean old caches, take control
self.addEventListener("activate", function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE; })
          .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch: cache-first for app shell, network-first for data
self.addEventListener("fetch", function(e) {
  var url = new URL(e.request.url);
  var isDataFile = /\.json$/.test(url.pathname);
  var isAppShell = CACHE_ASSETS.indexOf(url.pathname) >= 0;
  var isR2Audio = url.hostname.indexOf("r2.dev") >= 0;

  // Data files (study_data_compact.json, english_data.json): network-first
  if (isDataFile) {
    e.respondWith(
      caches.open(CACHE).then(function(cache) {
        return fetch(e.request).then(function(response) {
          if (response && response.ok) {
            cache.put(e.request, response.clone());
          }
          return response;
        }).catch(function() {
          return cache.match(e.request).then(function(cached) {
            return cached || new Response("Offline", {status: 503});
          });
        });
      })
    );
    return;
  }

  // App shell: cache-first (works offline)
  if (isAppShell) {
    e.respondWith(
      caches.match(e.request).then(function(cached) {
        return cached || fetch(e.request);
      })
    );
    return;
  }

  // Audio files from R2: network-first with cache
  if (isR2Audio) {
    e.respondWith(
      caches.open(CACHE).then(function(cache) {
        return cache.match(e.request).then(function(cached) {
          var fetchPromise = fetch(e.request).then(function(response) {
            if (response && response.ok) {
              cache.put(e.request, response.clone());
            }
            return response;
          }).catch(function() {
            return cached;
          });
          return cached || fetchPromise;
        });
      })
    );
    return;
  }

  // Other (CDN resources etc): network first
  e.respondWith(
    caches.open(CACHE).then(function(cache) {
      return fetch(e.request).then(function(response) {
        if (response && response.ok && response.type === "basic") {
          cache.put(e.request, response.clone());
        }
        return response;
      }).catch(function() {
        return cache.match(e.request);
      });
    })
  );
});
