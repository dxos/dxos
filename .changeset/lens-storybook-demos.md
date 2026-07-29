---
'@dxos/echo-panproto': minor
---

`useLens` on the new `@dxos/echo-panproto/react` entrypoint, mirroring `@dxos/echo-react`'s `useObject` tuple and overload shape: read a live ECHO object through an object lens and write back through it. It sits on its own subpath so the package's main entry stays React-free — the wire runner loads in workers — and it lives here rather than in `@dxos/echo-react` so the whole lens surface stays in one package until the API is internalized. The property overload subscribes only through that property's mapping (`from`), so a peer editing an unrelated field does not re-render the control. A lens holds no state of its own — reactivity comes from the base object's atom, so a replicated change or an overlay write reprojects the view.

`Lens.register` now preserves its argument's precise type, so a registered lens has a nameable type without an explicit annotation.
