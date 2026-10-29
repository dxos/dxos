---
'@dxos/types': minor
'@dxos/plugin-debug': minor
---

The Hello Worker space template now starts from a partial plan for the assistant to finish. It seeds a `Spec` object holding a partly written `.mdl` spec (Deus), four planned features on the project's feature map that cite it, and three planning tasks: complete the spec, draw its architecture, and plan the implementation as tasks. A feature's spec row opens the spec in the space. The `Spec` type moves from plugin-code to `@dxos/types` so any plugin can create one; its typename (`org.dxos.type.spec`) is unchanged, so existing specs keep working.
