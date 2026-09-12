---
'@dxos/app-framework': patch
---

The boot loader's plugin activation row now shows its icons on a cold first load. The row resolved each icon through an external `<use href="/icons.svg#…">`, which the browser only requests when the first icon lands; on an empty cache that ~200KB sprite arrived after the row had filled — or after the loader had gone — so the first visit showed empty slots and every later visit, served from cache, showed glyphs. The loader now fetches the sprite when it mounts and inlines its symbols, so the download starts with the page and the icons reference it locally.
