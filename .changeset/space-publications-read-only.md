---
'@dxos/app-toolkit': minor
'@dxos/plugin-space': minor
---

A space can be published as a read-only copy at a public link, republished or unpublished, and forked from the link into Composer. `SpaceOperation` gains `PublishSpace`, `UnpublishSpace` and `ForkPublication`, and a space gains a `description`. A published space carries `AppAnnotation.PublicationAnnotation` on its properties; `@dxos/plugin-space/PublicationLink` builds the viewer, fork and archive links, and `@dxos/plugin-space/PublicationManifest` is the manifest the viewer host reads. A host contributes `AppCapabilities.ReadOnly` to make the app read-only: plugins read it with `ReadOnly.atom`, `ReadOnly.unless` and `ReadOnly.isActive` from `@dxos/app-toolkit/ReadOnly`, or `Hooks.useReadOnly` and `Hooks.unlessReadOnly` in components, and drop the controls, actions and background work that write. `useObjectMenuItems`, `ObjectForm` and `TableToolbar` take a `readonly` option.
