---
'@dxos/brand': minor
---

Each background in `assets/backgrounds` whose icon sits on one side now comes as a pair, `bg-<name>-left.svg` and `bg-<name>-right.svg`, for `dxns`, `echo`, `halo`, `kube` and `mesh`. `bg-dxos.svg` is unchanged.

**Breaking:** the single-sided files `bg-dxns.svg`, `bg-echo.svg`, `bg-halo.svg`, `bg-kube.svg` and `bg-mesh.svg` are removed. Each is now the variant named for its icon's side: `bg-echo-left.svg`, `bg-kube-left.svg`, `bg-dxns-right.svg`, `bg-halo-right.svg` and `bg-mesh-right.svg`.
