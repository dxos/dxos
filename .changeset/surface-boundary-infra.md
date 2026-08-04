---
'@dxos/app-framework': minor
'@dxos/react-ui-dnd': minor
---

Web-component surface boundary infrastructure (flag-off): `SurfaceRootProviders` root factory, `<dx-surface-root>` boundary element with per-role allowlist (`Surface.registerRootElement` / `Surface.setBoundaryRoles`), and `DndCoordinator` — DnD coordination state extracted from `Dnd.Root` React context into a shared plain-JS coordinator so drag coordination works across React roots. No behavior change with the allowlist empty (the default).
