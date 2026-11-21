# autocue as a public package

Today `@dxos/autocue` is private, exports TypeScript source, and is consumed only inside the repo: the `autocue`
skill (`.agents/skills/autocue/scripts`, ~5.4k lines of Node: Playwright driver, recorder, ffmpeg trimming,
pack/upload, voiceover) and the showcase scripts in `showcase/`. The goal is to use autocue from a Composer plugin.
A plugin runs in the browser, so it cannot run Playwright or ffmpeg. The work is split in two phases.

## Phase 1 — browser package and a Player surface

### Entry points

The package builds with the repo's `ts-vite-build` pipeline (`vite.config.ts` re-exporting the root `defineConfig`)
into `dist/lib/*.mjs` + `dist/types/`, with `source` conditions so in-repo consumers still resolve source.

| Export                 | Source                          | Contents                                                     |
| ---------------------- | ------------------------------- | ------------------------------------------------------------ |
| `@dxos/autocue`        | `src/index.ts`                  | Frame (plain-DOM `createFrame` + React `Frame`) and `TOKENS` |
| `@dxos/autocue/player` | `src/player/index.ts` (new)     | `Player`, `Manifest` types, `loadBundle(url)` (new)          |
| `@dxos/autocue/grid`   | `src/components/Grid/index.ts`  | `Grid` and its layout helpers                                |
| `@dxos/autocue/ident`  | `src/components/Ident/index.ts` | Remotion compositions + `IdentPlayer`; no `registerRoot`     |

The root no longer re-exports the Ident: a consumer of the Frame should not pull in Remotion.
`src/components/Ident/remotion.ts` (`registerRoot`) stays out of every entry; only the `studio`/`render` tasks use it.

`package.json` gains `files: ["dist", "src"]`, `sideEffects: false`, `types`, and `publishConfig` per the
`npm-publishing` skill, and keeps `"private": true` until a trusted publisher exists.

### Dependency split

| Kind          | Packages                                                                                                                                                                                              |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| peer          | `react`, `react-dom`, `effect`; `@dxos/react-ui`, `@dxos/react-ui-attention`, `@dxos/react-ui-dnd`, `@dxos/ui-theme` (`workspace:^`)                                                                  |
| dependency    | `@dxos/brand`, `@dxos/plugin-deck` (Pane), `@dxos/react-ui-canvas`, `remotion`, `@remotion/player`, `@remotion/fonts`, `@remotion/motion-blur`, `@fontsource/poiret-one`, `tailwindcss` (colors only) |
| optional peer | none                                                                                                                                                                                                  |
| dev only      | `@remotion/cli`, `@remotion/bundler`, `@remotion/renderer`, storybook, vite, the player-page build tooling                                                                                            |

`@remotion/cli` moves from dependencies to devDependencies: it is only used by `moon run autocue:studio/render` and
`trim-static.mjs`, which run inside the repo.

The Player uses `@dxos/plugin-deck/Pane` for its plank chrome, so it stays a dependency for now. A public library
depending on a Composer plugin is heavy (plugin-deck pulls in app-framework); moving Pane into a `react-ui*` package
would drop it.

`build` sets `publicDir: false`: `public/` is the Remotion project's static folder and holds a commercially licensed
font that must never be published.

### Player in a host page

`Player` takes `layout`: `page` (default) owns the window — full viewport height, keys on the document — as the
bundle's own `index.html`; `embedded` fills its container and answers keys only while focus is inside it, so a host
such as Composer keeps its own shortcuts. `loadBundle(url)` (an `Effect`) fetches `<root>/autocue.json` for a bundle
folder, `index.html` or manifest URL and rebases bundle-relative video, poster and archive paths onto the root.

### Which plugin hosts the Player

A new private `@dxos/plugin-autocue`:

- ECHO type `AutocueBundle` `{ name, url }` — a link to a bundle on dx.pub (or any host serving `autocue.json`).
- Article surface: fetch `<url>/autocue.json`, resolve relative paths against `url`, render `<Player>`.
- Create-object form with the URL; translations; `PLUGIN.mdl`.
- Storybook: `AutocueArticle` playing a real bundle.

`plugin-video` was considered: it owns stored `Video` objects and transcription, and an autocue bundle (several
demos, chapters, spec, prompt) is a different object, so a separate plugin keeps both small.

### Consumers kept working

| Consumer                              | Change                                                               |
| ------------------------------------- | -------------------------------------------------------------------- |
| `pack.mjs` (builds `player/`)         | unchanged path; `player/main.tsx` imports from `src/player/index.ts` |
| `inject.mjs` (`create-frame.ts`)      | unchanged — it imports the source file by path, which still exists   |
| `trim-static.mjs` (renders the Ident) | unchanged — runs `scripts/render.mjs` in `tools/autocue`             |
| `showcase/*`, Grid story on :9009     | unchanged — stories stay in `src`                                    |

## Phase 2 — Node engine (outline, separate PR)

- Move the engine from `.agents/skills/autocue/scripts` into `@dxos/autocue/node` (driver, recorder, trimmer,
  pack/upload, voiceover), with a `bin` (`autocue record|trim|pack|serve`).
- `npx @dxos/autocue serve`: a loopback HTTP service the plugin calls to record, trim and pack against a running
  Composer; the plugin shows progress and adds the resulting bundle as an `AutocueBundle`.
- Flows become data: an operation-backed flow format the plugin can author, replacing `.mjs` flow files.
- The skill is rewired to call the bin instead of its own scripts.
- Optional: the same service in an EDGE container, so recording needs no local machine.
