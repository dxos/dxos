---
'@dxos/app-framework': minor
---

Surface definitions accept an optional `props` mapper, so a container can be registered directly and have the surface's data envelope mapped onto its own props instead of being wrapped in an inline component. The mapper's input type derives from the definition's `filter`, and is exported as `Surface.ComponentProps`. `component` now accepts any `ComponentType`.
