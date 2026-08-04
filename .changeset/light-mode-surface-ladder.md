---
'@dxos/react-ui': minor
'@dxos/ui-theme': minor
---

Rework the light-mode surface ladder and control states.

Surface levels, separators, wells, scrollbar thumbs and rail tones are now
derived from the enclosing `--surface-bg` and attenuated for light mode through
a single `--dx-attenuate-*` table, replacing several fixed neutrals that had
drifted from the ladder. Filled controls derive their hover from their own fill
(`--color-input-bg-hover`) rather than from the host surface, so hovering a
default button no longer lightens it into the selected tone. `Panel.Toolbar`
owns the toolbar bar treatment, so a nested `Toolbar.Root` matches content width
without floating. Cards now carry their padding unconditionally.
