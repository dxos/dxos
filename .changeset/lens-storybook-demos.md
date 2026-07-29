---
'@dxos/echo-react': minor
'@dxos/echo-panproto': patch
---

`useLens` in `@dxos/echo-react`, beside `useObject` and mirroring its tuple and overload shape: read a live ECHO object through an object lens and write back through it. The property overload subscribes only through that property's mapping (`from`), so a peer editing an unrelated field does not re-render the control. A lens holds no state of its own — reactivity comes from the base object's atom, so a replicated change or an overlay write reprojects the view.

`Lens.register` now preserves its argument's precise type, so a registered lens has a nameable type without an explicit annotation.
