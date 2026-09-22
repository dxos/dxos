---
'@dxos/app-toolkit': minor
'@dxos/plugin-space': minor
---

Offer themed space templates in the create-space dialog, contributed by any plugin through `AppCapabilities.SpaceTemplate` and built with `@dxos/app-toolkit/SampleSpace`; the onboarding space is one of them, built on demand rather than imported from a bundled archive. Breaking: `ClientEvents.SpacesReady` is now `SpacesAvailable`, and `AppSpace.SAMPLE_SPACE_TAG`/`isSampleSpace` are gone — a space records the template it came from in `AppAnnotation.SpaceTemplateAnnotation` instead.
