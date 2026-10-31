# @dxos/ui-types

## 0.17.0

### Patch Changes

- 1a0fff1: Keep guided tours working on a narrow plank: a step pointing at a toolbar control now opens the overflow menu when the toolbar has folded that control away, and a step whose target never appears is stepped over rather than ending the tour.

## 0.16.0

## 0.15.0

## 0.14.0

## 0.13.0

## 0.12.0

### Patch Changes

- d4b4919: `dx-anchor` preview cards now open on hover by default (`trigger='click'` opts out) with a
  shadcn-style fade+zoom animation; hosts close on `state: false`. Editor block widgets survive
  replacement (root-keyed unmount) and suspending portals; `#`/`@` link chips resolve the linked
  object's label.

## 0.11.1

## 0.11.0

### Minor Changes

- ed992c2: Remove `className` from `ComposableProps`, so `classNames` is the only styling prop a consumer may
  pass to a composable or slottable component. Accepting both gave every part two indistinguishable
  props, and a part that destructured one while spreading the other silently dropped the caller's
  classes. Passing `className` to such a component is now a compile error; rename it to `classNames`.
  Radix `Slot` still injects `className` at runtime — implementations receive it through
  `HTMLAttributes` and `composableProps` merges it, so slotted composition is unchanged.
