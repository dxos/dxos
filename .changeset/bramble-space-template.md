---
'@dxos/app-framework': minor
'@dxos/app-toolkit': minor
'@dxos/plugin-debug': minor
'@dxos/plugin-onboarding': minor
'@dxos/plugin-space': minor
---

The Bramble Coffee Roasters space is a template any plugin can contribute, and it is built on
demand rather than shipped as an archive.

One capability, and two words that mean different layers. A **sample space** is content and the
recipe for it: `@dxos/app-toolkit/SampleSpace` builds one from phases. A **space template** is an
entry in the create dialog, and `AppCapabilities.SpaceTemplate` is now the only capability that
carries one — `SampleSpace.makeTemplate(...)` offers a definition as one, and a template that has
no sample space behind it (a hand-written `apply`) is equally valid. plugin-space lists templates
without owning the capability, and the debug plugin's adapter between two near-identical
capabilities is gone, along with the icon-by-list-index it used to assign: a template's icon and
hue come from its own definition. Contributions go through `AppCapability.spaceTemplates(loader)`
and activate on `ActivationEvents.SpaceTemplatesRequested`, fired by the create dialog and by
`SpaceOperation.Create` when a caller names a template by id.

Each sample space has its own namespace subpath — `@dxos/plugin-debug/WeatherSpace`, exporting
`make()` — so importing one no longer evaluates the module graphs of the other five.

A template can set `hidden`, keeping it out of the create picker while leaving it reachable by id —
the same escape hatch `RoutineCapabilities.Template` has.

A space created from a template records which one in `AppAnnotation.SpaceTemplateAnnotation`, and
`AppSpace.findSpaceFromTemplate` reads it back. That replaces the tag the onboarding space carried:
a tag takes a space out of the user-facing lists, so every reader needed an exception for it.
`AppSpace.SAMPLE_SPACE_TAG` and `isSampleSpace` are gone; profiles that onboarded earlier keep the
persisted tag and stay visible.

First launch builds Bramble through its template instead of importing
`plugin-onboarding/src/content/sample/space.dx.json`, which is deleted along with the script that
generated it and the settings button that re-imported it. The content has one source now: the
phases under `plugin-onboarding/src/samples/bramble/`, asserted by a test that builds the archive.
Building the whole world takes about a second.
