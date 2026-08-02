---
'@dxos/react-ui': minor
---

Consolidate the theme's elevation ladder onto a single documented definition and remove dead theme
surface. Breaking: `Column.Bleed` (unused; `ScrollArea` auto-bleeds inside `Column.Root`),
`ghostHover`/`ghostFocusWithin` (use the `dx-hover` utility), and `densityBlockSize` are removed; the
`.dx-panel` hue-tinted callout class is renamed `.dx-callout`; the unconsumed `--dx-lacuna-*`,
`--dx-input-{sm,md,lg}`, `--spacing-icon-button-padding`, and `--spacing-scroll-padding` tokens and
the `dx-column`, `dx-hover-row`, and `dx-current-row` classes are deleted. Light-mode elevation
levels 1 and 3 shift one ramp stop so the ladder is monotonic in both themes, and `.dx-density-md`
is now defined so a nested region can reset density.
