---
'@dxos/app-framework': minor
'@dxos/app-toolkit': minor
'@dxos/plugin-debug': minor
'@dxos/plugin-onboarding': minor
'@dxos/plugin-space': minor
---

The Bramble Coffee Roasters space is a template any plugin can contribute, and it is built on
demand rather than shipped as an archive.

One capability now carries themed content: `SpaceCapabilities.SpaceTemplate`. `AppCapabilities.SampleSpace`
and the debug plugin's adapter between the two are gone, along with the icon-by-list-index it used
to assign — a template's icon and hue come from its own definition, which is what made a second
contributing plugin possible at all. `SpaceCapability.spaceTemplates(loader)` is the module maker;
contributions activate on `ActivationEvents.SpaceTemplatesRequested`, fired by the create dialog and
by `SpaceOperation.Create` when a caller names a template by id.

A template can set `hidden`, keeping it out of the create picker while leaving it reachable by id —
the same escape hatch `RoutineCapabilities.Template` has.

First launch builds Bramble through that template instead of importing
`plugin-onboarding/src/content/sample/space.dx.json`, which is deleted along with the script that
generated it and the settings button that re-imported it. The content has one source now: the
phases under `plugin-onboarding/src/sample/`, asserted by a test that builds the archive. Building
the whole world takes about a second.

`SpaceOperation.Create` takes `tags`, which is how the onboarding space keeps the tag that marks it
as the sample.
