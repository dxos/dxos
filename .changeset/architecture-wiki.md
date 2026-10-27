---
'@dxos/plugin-canvas': patch
'@dxos/plugin-space': patch
'@dxos/app-toolkit': patch
---

The DXOS Architecture space template is now the DXOS design wiki: alongside its drawings it seeds a page per spec in the repository (`PLUGIN.mdl`, `SPEC.mdl` and every spec `FEATURES.mdl` cites), grouped into one collection per feature-map area, a front page that links every page and embeds the architecture drawings, and a deck presenting the feature map. The pages are generated from the specs by `generate-wiki.ts`, which the new `architecture-wiki` routine reruns. A space template can now name the plugins its content needs (`SpaceTemplate.plugins`, `SampleSpace.makeTemplate({ plugins })`); applying the template enables any that are installed but off and shows a toast naming them.
