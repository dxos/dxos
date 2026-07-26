---
'@dxos/ui-theme': patch
---

Disable the Tailwind/Vite file watcher in `ThemePlugin` when running under Vitest. Its `server.watch` config was a non-null object that overrode the test runner's `watch: null`, keeping a live watcher whose per-file `fs_event` handles (registered by Tailwind's `@source` scan) were never released — hanging single-pass `vitest run` teardown so the process never exited. HMR-ignore patterns are retained for interactive `storybook dev` / `vite dev`.
