# @dxos/ui-theme

## 1.0.0

### Patch Changes

- @dxos/node-std@1.0.0
- @dxos/ui-types@1.0.0

## 0.11.1

### Patch Changes

- @dxos/log@0.11.1
- @dxos/node-std@0.11.1
- @dxos/util@0.11.1

## 0.11.0

### Minor Changes

- e65432c: Rework the light-mode surface ladder and control states.

  Surface levels, separators, wells, scrollbar thumbs and rail tones are now
  derived from the enclosing `--surface-bg` and attenuated for light mode through
  a single `--dx-attenuate-*` table, replacing several fixed neutrals that had
  drifted from the ladder. Filled controls derive their hover from their own fill
  (`--color-input-bg-hover`) rather than from the host surface, so hovering a
  default button no longer lightens it into the selected tone. `Panel.Toolbar`
  owns the toolbar bar treatment, so a nested `Toolbar.Root` matches content width
  without floating. Cards now carry their padding unconditionally.

- c58ebb7: Export design tokens as `@dxos/ui-theme/tokens.css`, so stylesheets compiled outside this repo — Composer plugins loaded from the registry — can generate token-backed utilities themselves rather than relying on whichever ones the host happens to bundle.

### Patch Changes

- 4df6cf3: Disable the Tailwind/Vite file watcher in `ThemePlugin` when running under Vitest. Its `server.watch` config was a non-null object that overrode the test runner's `watch: null`, keeping a live watcher whose per-file `fs_event` handles (registered by Tailwind's `@source` scan) were never released — hanging single-pass `vitest run` teardown so the process never exited. HMR-ignore patterns are retained for interactive `storybook dev` / `vite dev`.
- Updated dependencies [3f1fc67]
- Updated dependencies [f6a01e3]
  - @dxos/util@0.11.0
  - @dxos/log@0.11.0
  - @dxos/node-std@0.11.0
