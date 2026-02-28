# Tailwind Token audit

## Tasks

The following tasks apply to the entire codebase.
Update this document with the results of the following tasks:

- [x] Find invalid tailwind classes (e.g., any camelCase classes)
- [x] Compile list of used and unused custom utility classes from our theme
- [x] Compile list of used and unused component classes from our theme
- [x] Compile list of unused fragment (exported consts and functions in `ui-theme/src/theme/fragments`)

## Results

### Invalid classes

### Utility classes

#### Used

- `dx-icon-inline`

#### Unused

_(None — only one utility class exists and it's used)_

### Component classes

#### Used

`dx-button`, `dx-checkbox`, `dx-checkbox--switch`, `dx-dialog__overlay`, `dx-dialog__content`, `dx-dialog__title`, `dx-focus-ring` (all variants), `dx-text-hue`, `dx-link`, `dx-modal-surface`, `dx-attention-surface`, `dx-tag` (all variants), `dx-main-bounce-layout`, `dx-main-mobile-layout`, `dx-main-content-padding-transitions`, `dx-main-intrinsic-size`, `dx-main-sidebar`, `dx-main-overlay`, `dx-main-content-padding`, 

#### Used (no dx- prefix)

`app-drag`, `app-no-drag`, `overflow-anchored`, `overflow-anchor`, `contain-layout`, `sticky-top-from-topbar-bottom`, `sticky-bottom-from-statusbar-bottom`, `size-container`, `container-max-width`, `card-square`, `card-default-width`, `card-min-width`, `card-max-width`, `popover-card`, `density-coarse`

#### Unused

| Class | File |
|---|---|
| `drag-preview-p-0`    | `config/components/drag-preview.css`  |
| `dx-scrollbar-thin`   | `config/components/scrollbar.css`     |
| `dx-base-surface`     | `config/components/surface.css`       |
| `dx-sidebar-surface`  | `config/components/surface.css`       |
| `snap-inline`         | `config/layout/positioning.css`       |
| `snap-block`          | `config/layout/positioning.css`       |
| `sticky-top-0`        | `config/layout/positioning.css`       |

### Unused Fragments
