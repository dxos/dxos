---
'@dxos/app-framework': patch
'@dxos/react-hooks': patch
---

`Surface` now holds the previous `data` reference while the incoming one is shallow-equal to it, so a surface acts as a real memo boundary.

Almost every call site passes `data` as an object literal (`data={{ subject }}`), which is a fresh reference on each of the caller's renders. `SurfaceComponent` and `SurfaceContextProvider` are both `memo`-wrapped, but the unstable prop defeated the comparison, so every ancestor render re-rendered the whole contributed subtree. Deep plugin trees paid this on every render above them.

Shallow equality is the right depth because the values inside `data` already carry stable identities. An ECHO object is a singleton proxy whose identity survives mutation, and a surface subtree stays fresh through its own subscriptions rather than through re-renders propagated from above.

The `data` default no longer comes from `useDefaultValue`, which mirrored the prop into state via an effect and so delivered each genuine change one commit late.

The `dataUnstable` / `dataChurn` dev metrics are now measured on the caller's raw `data` prop, since the stabilization absorbs the identity change before it reaches the subtree. A flagged surface is now a hygiene finding (the call site rebuilds `data` every render and the framework pays to normalize it) rather than a live re-render hazard.

Adds `useStable(value, equals)` to `@dxos/react-hooks`: it holds the previous reference for as long as `equals` accepts the incoming value. `Surface` uses it with `shallowEqual`.
