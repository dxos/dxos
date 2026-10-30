---
'@dxos/compute': minor
'@dxos/types': minor
---

`Spec` moves to `@dxos/compute` (`@dxos/compute/Spec`, typename `org.dxos.type.projects.spec` 0.3.0) and holds its `.mdl` text as `content`, with the dialects it uses listed in `dialects`. A project owns any number of specs: `Project` 0.7.0 replaces `spec` with `specs`. Breaking: `SpecDocument` is removed from `@dxos/types`; plugin-projects' migrations fold each spec document into its spec, and keep a spec's features and canvas layout as annotations on it.
