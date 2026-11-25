// Lets Motion appear in the phone's Share menu for audio (for example a WhatsApp voice note).
// The shared file is kept for a moment, then the app opens and picks it up.
self.addEventListener('fetch', function (event) {
  var url = new URL(event.request.url);
  if (event.request.method !== 'POST' || url.pathname !== '/share-voice-note') return;
  event.respondWith(
    (async function () {
      try {
        var form = await event.request.formData();
        var files = form.getAll('audio');
        var file = null;
        for (var i = 0; i < files.length; i++) {
          if (files[i] && typeof files[i] === 'object' && 'size' in files[i]) { file = files[i]; break; }
        }
        if (file) {
          var cache = await caches.open('motion-shared');
          await cache.put(
            '/shared-file',
            new Response(file, {
              headers: {
                'Content-Type': file.type || 'application/octet-stream',
                'X-File-Name': encodeURIComponent(file.name || 'shared voice note'),
              },
            })
          );
        }
      } catch (e) {
        /* nothing could be kept: the app opens anyway */
      }
      return Response.redirect('/?shared=voice-note', 303);
    })()
  );
});
