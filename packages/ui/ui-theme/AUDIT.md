# Tailwind Token audit

## Tasks

The following tasks apply to the entire codebase.
For all results lists, add one line per item and keep the list sorted alphabetically.
Update this document with the results of the following tasks:

## Phase 1

- [x] Find invalid tailwind classes (e.g., any camelCase classes)
- [x] Compile list of used and unused custom utility classes from our theme
- [x] Compile list of used and unused component classes from our theme
- [x] Compile list of unused fragment (exported consts and functions in `ui-theme/src/theme/fragments`)
- [x] Add -dx prefix to :root spacing.css styles.

## Phase 2

- [ ] Density audit.
- [ ] Semantic color audit.

## Results

### Invalid classes

### Utility classes

#### Used

- `dx-icon-inline`

#### Unused

None

### Component classes

#### Used (dx- prefix)

- `dx-attention-surface`
- `dx-button`
- `dx-checkbox`
- `dx-checkbox--switch`
- `dx-dialog__content`
- `dx-dialog__overlay`
- `dx-dialog__title`
- `dx-focus-ring`
- `dx-focus-ring-group`
- `dx-focus-ring-group-indicator`
- `dx-focus-ring-group-x`
- `dx-focus-ring-group-x-always`
- `dx-focus-ring-group-x-indicator`
- `dx-focus-ring-group-y`
- `dx-focus-ring-group-y-always`
- `dx-focus-ring-group-y-indicator`
- `dx-focus-ring-inset`
- `dx-focus-ring-inset-over-all`
- `dx-focus-ring-inset-over-all-always`
- `dx-focus-ring-main`
- `dx-link`
- `dx-main-bounce-layout`
- `dx-main-content-padding`
- `dx-main-content-padding-transitions`
- `dx-main-intrinsic-size`
- `dx-main-mobile-layout`
- `dx-main-overlay`
- `dx-main-sidebar`
- `dx-modal-surface`
- `dx-tag` (all variants)
- `dx-text`

#### Used (no dx- prefix)

- `dx-app-drag`
- `dx-app-no-drag`
- `dx-card-max-width`
- `dx-card-min-width`
- `dx-card-popover`
- `dx-card-square`
- `dx-contain-layout`
- `dx-container-max-width`
- `dx-density-coarse`
- `dx-overflow-anchor`
- `dx-overflow-anchored`
- `dx-size-container`
- `dx-sticky-bottom-from-statusbar-bottom`
- `dx-sticky-top-from-topbar-bottom`

#### Unused

- `dx-card-default-width`
- `dx-base-surface`
- `dx-focus-ring-always`
- `dx-focus-ring-group-always`
- `dx-focus-ring-inset-always`
- `dx-focus-ring-main-always`
- `dx-scrollbar-thin`
- `dx-sidebar-surface`

### Unused Fragments

None