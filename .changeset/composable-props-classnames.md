---
'@dxos/ui-types': minor
'@dxos/react-ui': minor
---

Remove `className` from `ComposableProps`, so `classNames` is the only styling prop a consumer may
pass to a composable or slottable component. Accepting both gave every part two indistinguishable
props, and a part that destructured one while spreading the other silently dropped the caller's
classes. Passing `className` to such a component is now a compile error; rename it to `classNames`.
Radix `Slot` still injects `className` at runtime — implementations receive it through
`HTMLAttributes` and `composableProps` merges it, so slotted composition is unchanged.
