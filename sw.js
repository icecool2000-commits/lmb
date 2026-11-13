// Cache simples: a página abre mesmo com internet fraca; os dados vêm do Firebase.
const C = "lmb-v46";
const FILES = ["./", "index.html", "config.js", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png", "logo.png", "fundo-topo.jpg", "torneio.js", "torneio-core.js", "torneio-demo.js", "exportar.js", "midias.js", "aovivo.js", "rodizio.js", "basquete.js", "estatequipe.js", "acesso.js", "torneio.css", "biribol-anim.js", "anim/abertura.jpg", "lottie_svg.min.js", "anim/lmb-logo.json", "anim/lmb-base.webp", "anim/lmb-anel.webp", "anim/lmb-bola.webp", "anim/lmb-letras.webp", "anim/lmb-tudo.webp"];
self.addEventListener("install", e => { e.waitUntil(caches.open(C).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  // vídeo da abertura: o navegador pede por partes (Range); fica com o cache HTTP normal
  if (u.pathname.endsWith(".mp4")) return;
  // rede primeiro (sempre a versão nova), cache se estiver sem internet
  e.respondWith(fetch(e.request, { cache: "no-cache" }).then(r => { const cp = r.clone(); caches.open(C).then(c => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request)));
});
