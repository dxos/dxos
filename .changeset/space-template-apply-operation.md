---
'@dxos/app-toolkit': minor
'@dxos/plugin-magazine': minor
---

Space templates now run in the new space's process: `SpaceOperation.ApplyTemplate` applies them, so a template's `build` can schedule operations. Breaking: `SpaceTemplate.apply` returns an `Effect` (requiring `Operation.Service`) instead of a `Promise`, and `SampleSpace.Definition`, `applyTo` and `buildArchive` take an `R` type parameter for what `build` needs. The magazine plugin adds an AI Briefing template with five live AI news feeds and a magazine that curates itself after creation, and feed and magazine cards share one layout.
