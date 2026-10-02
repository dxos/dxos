---
'@dxos/react-ui': minor
---

`Dialog` now closes on Escape, traps focus and takes its initial focus when its content mounts after
the dialog opened — as lazily loaded content does — where before it did none of these. A `Form`
inside a dialog opens with the caret in its first text field rather than on Cancel, and
`lazyWithPreload` (from `@dxos/react-hooks`) fetches a lazy component ahead of use and renders it
without suspending once fetched; the command palette and search use it to open without a chunk load.
