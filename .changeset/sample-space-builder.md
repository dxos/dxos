---
'@dxos/app-toolkit': minor
'@dxos/plugin-onboarding': minor
---

Sample spaces are now built from a shared mechanism rather than one hand-written script per space.

`@dxos/app-toolkit/SampleSpace` is an Effect builder whose unit is a *phase*: a named piece of
content that declares the schemas it needs, so a space's type registration is derived from its phase
list instead of a hand-maintained array that drifts. It supplies the services sample content keeps
re-implementing — a fixed reference clock (so a rebuild produces the same timestamps), deferred feed
appends (feed entities only get DXNs after a flush, which is now structural rather than a comment),
root-collection bootstrap, and tag URIs resolved once and stored space-relative so membership
survives the space-id remap on import — plus `collection`, `children`, `seed` and `tagBatch`.

One definition runs either way: `applyTo` writes it into a live space, and `buildArchive`
(in `@dxos/app-toolkit/testing`) builds it headlessly into a `.dx.json` archive. That is what lets
the content behind a committed onboarding snapshot also serve as an in-app preset.

Three sample spaces run on it — Bramble Coffee Roasters (the onboarding snapshot, unchanged in
content: 77 objects, 3 feeds, 127 typed entities), a software-project space, and a CRM pipeline —
and the Gmail mbox importer was ported to it as well, retiring the last copy of the
boot/create/populate/export harness the scripts used to duplicate.

Plugins offer their sample spaces through a new `AppCapabilities.SampleSpace` contribution, gated on
`ActivationEvents.SampleSpacesRequested` so the content loads only once something asks for the list.
The debug plugin's space generator lists whatever was contributed, and depends on no contributor.
