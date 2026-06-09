const CACHE = "youlingo-v3";
const AUDIO_CACHE = "youlingo-audio-v1";
const CACHE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./favicon.svg",
  "./icon-192.png",
  "./icon-512.png"
];
const AUDIO_CACHE_LIMIT = 500; // 最多缓存500个音频文件

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
        keys.filter(function(k) { return k !== CACHE && k !== AUDIO_CACHE; })
          .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// LRU: evict oldest audio entries when cache exceeds limit
function trimAudioCache() {
  return caches.open(AUDIO_CACHE).then(function(cache) {
    return cache.keys().then(function(keys) {
      if (keys.length <= AUDIO_CACHE_LIMIT) return;
      var toDelete = keys.length - AUDIO_CACHE_LIMIT;
      // keys() returns in insertion order — oldest first
      var deletes = [];
      for (var i = 0; i < toDelete; i++) {
        deletes.push(cache.delete(keys[i]));
      }
      return Promise.all(deletes);
    });
  });
}

// Fetch: cache-first for app shell, network-first for data
self.addEventListener("fetch", function(e) {
  var url = new URL(e.request.url);
  var isDataFile = /\.json$/.test(url.pathname);
  var isAppShell = CACHE_ASSETS.indexOf(url.pathname) >= 0;
  var isR2Audio = url.hostname.indexOf("r2.dev") >= 0;

  // Data files: network-first, fallback to cache
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

  // Audio files from R2: cache-first, separate cache with LRU limit
  if (isR2Audio) {
    e.respondWith(
      caches.open(AUDIO_CACHE).then(function(cache) {
        return cache.match(e.request).then(function(cached) {
          if (cached) return cached;
          return fetch(e.request).then(function(response) {
            if (response && response.ok) {
              cache.put(e.request, response.clone());
              // Evict old entries if over limit
              trimAudioCache();
            }
            return response;
          }).catch(function() {
            return new Response("", {status: 503});
          });
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
