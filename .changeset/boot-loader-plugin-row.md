---
'@dxos/app-framework': minor
---

The boot loader now shows plugin activation as a row of icons rather than a scrolling text log.

`window.__bootLoader` gains two methods: `plugins(entries)` registers the icon of every plugin that could activate (drawing nothing on its own), and `activated(id)` adds that plugin's icon to the row. Icons come from each plugin's own `meta.profile.icon` and resolve against the host's static sprite (`/icons.svg` by default; `bootLoaderPlugin({ spritePath })` overrides it). Arrivals queue and drain one at a time, spaced 200–400ms, since activation lands in bursts of a dozen inside a couple of frames.

The per-module `Activating …` status lines are gone by default — a boot emitted hundreds of them. `useApp({ verboseStatus: true })` brings them back, collapsed to one line per plugin; `composer-app` exposes that as `VITE_DX_BOOT_VERBOSE=true` or `?boot-verbose`.

`StartupProgress` gains `pluginName` and `pluginSlug`, identifying the plugin owning the in-flight module, so a host can render or filter transitions per plugin without parsing module ids.
