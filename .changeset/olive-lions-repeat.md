---
'@dxos/lit-ui': minor
'@dxos/react-ui': patch
'@dxos/ui-theme': patch
'@dxos/ui-editor': patch
'@dxos/react-ui-editor': patch
'@dxos/ui-types': patch
---

`dx-anchor` preview cards now open on hover by default (`trigger='click'` opts out) with a
shadcn-style fade+zoom animation; hosts close on `state: false`. Editor block widgets survive
replacement (root-keyed unmount) and suspending portals; `#`/`@` link chips resolve the linked
object's label.
