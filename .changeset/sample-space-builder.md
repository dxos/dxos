---
'@dxos/app-toolkit': minor
'@dxos/plugin-onboarding': minor
---

Sample spaces are now built from a shared mechanism, and a new space can be created from one.

`@dxos/app-toolkit/SampleSpace` is an Effect builder whose unit is a _phase_: a named piece of
content that declares the schemas it needs, so a space's type registration is derived from its phase
list instead of a hand-maintained array that drifts. It supplies the services sample content kept
re-implementing — a fixed reference clock (so a rebuild produces the same timestamps), deferred feed
appends (feed entities only get DXNs after a flush, which is now structural rather than a comment),
root-collection bootstrap, and tag URIs resolved once and stored space-relative so membership
survives the space-id remap on import — plus `collection`, `children`, `seed` and `tagBatch`.

One definition runs either way: `applyTo` writes it into a live space, and `buildArchive`
(in `@dxos/app-toolkit/testing`) builds it headlessly into a `.dx.json` archive, which is how a
build is asserted in a test.

Three sample spaces run on it — Bramble Coffee Roasters (the onboarding world, unchanged in
content: 77 objects, 3 feeds, 127 typed entities), a software-project space, and a CRM pipeline —
and the Gmail mbox importer was ported to it as well, retiring the last copy of the
boot/create/populate/export harness those scripts used to duplicate.

Plugins offer content through `AppCapabilities.SpaceTemplate`, which the Create Space dialog
lists, so a new space can be seeded from a template at creation time. Contributions are gated on
`ActivationEvents.SpaceTemplatesRequested` and load only once something asks for the list, so the
dialog depends on no content package.
