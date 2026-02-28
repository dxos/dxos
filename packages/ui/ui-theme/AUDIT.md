# Token audit

## Rules

- Color tokens are in the form --color-{hue}-{shade}
- Spacing tokens are in the form --spacing-{size}

## Tasks

- [x] Check old color token references in the form --dx-hue-xxx are now --color-hue-xxx
- [x] Check old spacing token references in the form --dx-xxx are now --spacing-xxx
- [x] Convert all CSS vars from --dx-camelCase to --dx-kebab-case
- [ ] Add either --spacing or --dx prefix to custom spacing tokens (e.g., --rail-content) and define.

## Notes

### Task 1 — color tokens
No `--dx-{hue}-xxx` references found in source files. Complete.

### Task 2 — spacing tokens
- `spacing.css`: Inlined `--dx-lacuna-*` values directly into `@theme` (`--spacing-trim-xs/sm/md/lg`).
- `spacing.css`: Replaced `var(--dx-input-fine/coarse)` with `var(--spacing-trim-xs/sm)` for `--spacing-icon-button-padding`.
- `spacing.css`: Added `--spacing-tag-padding-block: 0.125rem` to `@theme`.
- `tag.css`, `dx-tag-picker.pcss`: Replaced `var(--dx-tag-padding-block)` → `var(--spacing-tag-padding-block)`.
- `base.css`: Removed `--dx-tag-padding-block` definition.

### Task 3 — camelCase to kebab-case
- `annotations.ts`: `--dx-errorText` → `--color-error-text`
- `semantic.css`: Added `--color-active-text` and `--color-hover-surface-text` definitions.
- `theme.ts`: `--dx-activeSurfaceText` → `--color-active-text`, `--dx-hoverSurfaceText` → `--color-hover-surface-text`
- `base.css`: Restored `--dx-tag-padding-block` as bridge pointing to `var(--spacing-tag-padding-block)`.
- `CellValidationMessage.tsx`, `CellEditor.tsx`: `--dx-gridCellWidth` → `--dx-grid-cell-width`
- `dx-grid-axis-resize-handle.pcss`: `--dx-accentSurface` → `--color-accent-surface`, `--dx-hoverSurface` → `--color-hover-surface`
