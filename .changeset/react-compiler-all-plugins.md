---
'@dxos/plugin-space': patch
---

Enable the React Compiler (oxc backend) on every React plugin, and fix the reactive reads it would otherwise freeze.

The compiler memoizes render output keyed on prop identity. ECHO objects are singleton proxies whose identity survives mutation, so a component that read a mutable field directly in its render body — `Obj.getLabel(subject)`, a destructured `subject.name`, a `ref.target` — would keep showing the value from the render that populated the cache. Those reads now go through `useObject`/`useObjectValue`, which subscribe.
