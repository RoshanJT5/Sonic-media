/* The Sonic Media image cache
 *
 * Supabase Storage already serves public objects through its CDN. This worker
 * adds a browser-side cache-first layer so repeat visits do not request the
 * same storage object again, even for older uploads with a short HTTP TTL.
 */
'use strict';

const IMAGE_CACHE = 'sonic-media-images-v1';
const MAX_CACHED_IMAGES = 180;

function isCacheableImage(request) {
  if (request.method !== 'GET' || request.destination !== 'image') return false;

  const url = new URL(request.url);
  const isLocalAsset = url.origin === self.location.origin && url.pathname.startsWith('/assets/images/');
  const isSupabaseAsset = url.hostname.endsWith('.supabase.co') &&
    /^\/storage\/v1\/(?:object|render\/image)\/public\//.test(url.pathname);

  return isLocalAsset || isSupabaseAsset;
}

async function trimImageCache(cache) {
  const keys = await cache.keys();
  const excess = keys.length - MAX_CACHED_IMAGES;
  if (excess <= 0) return;
  await Promise.all(keys.slice(0, excess).map(key => cache.delete(key)));
}

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter(name => name.startsWith('sonic-media-images-') && name !== IMAGE_CACHE)
        .map(name => caches.delete(name))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (!isCacheableImage(request)) return;

  event.respondWith((async () => {
    const cache = await caches.open(IMAGE_CACHE);
    const cached = await cache.match(request);
    if (cached) return cached;

    const response = await fetch(request);
    if (response.ok || response.type === 'opaque') {
      event.waitUntil((async () => {
        await cache.put(request, response.clone());
        await trimImageCache(cache);
      })());
    }
    return response;
  })());
});
