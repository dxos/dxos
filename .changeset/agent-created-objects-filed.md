---
'@dxos/plugin-markdown': patch
'@dxos/plugin-sheet': patch
'@dxos/plugin-presenter': patch
'@dxos/plugin-illustrator': patch
'@dxos/app-toolkit': patch
---

Documents, sheets and presentations an agent creates on EDGE, and drawings it copies with `convert`, are filed into the space's collection again: these operations hand the new object to `SpaceOperation.AddObject`, which plugin-space runs with its filing rule, instead of looking for that rule in a bundle that does not have it. `DefaultParent.resolve` warns when a collection item has no filing rule at all.
