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

## Phase 2

- [ ] Add -dx prefix to :root spacing.css styles.

## Phase 3

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
- `dx-text-hue`

#### Used (no dx- prefix)

- `app-drag`
- `app-no-drag`
- `card-max-width`
- `card-min-width`
- `card-popover`
- `card-square`
- `contain-layout`
- `container-max-width`
- `density-coarse`
- `overflow-anchor`
- `overflow-anchored`
- `size-container`
- `sticky-bottom-from-statusbar-bottom`
- `sticky-top-from-topbar-bottom`

#### Unused

- `card-default-width`
- `dx-base-surface`
- `dx-focus-ring-always`
- `dx-focus-ring-group-always`
- `dx-focus-ring-inset-always`
- `dx-focus-ring-main-always`
- `dx-scrollbar-thin`
- `dx-sidebar-surface`
- `sticky-top-0`

### Unused Fragments

None