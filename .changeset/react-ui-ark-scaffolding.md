---
'@dxos/react-ui': minor
---

Own the composite-component scaffolding instead of importing it from Radix: `@dxos/react-hooks` now exports `createContext`, `composeRefs`/`useComposedRefs`, `useControllableState` and `composeEventHandlers`, and every `@dxos/react-ui*` part renders through Ark's `ark.<tag>` factory (same `asChild` contract). Breaking: the scoped-context exports of `@dxos/react-list`, `@dxos/react-input`, `@dxos/react-ui-grid`, `@dxos/react-ui-menu` and `@dxos/react-ui-syntax-highlighter` (`create*Scope`, `*ScopedProps`, the `__*Scope` props) are removed; their contexts are plain React contexts now.
