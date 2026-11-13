---
'@dxos/types': minor
---

Features now live on specs instead of projects. A spec (`Spec.Spec` in `@dxos/plugin-projects`) is a feature map that the sidebar lists. A feature nests by owning one spec of its own, and a spec may name the project that tracks its tasks and hold one `SpecDocument` as its normative text. Breaking: `Spec` in `@dxos/types` is renamed `SpecDocument` (typename `org.dxos.type.specDocument`). `Feature` drops `project`, `parent` and `position`, and `FeatureOperation` inputs take a `spec` in place of a `project`. Migrations move existing data.
