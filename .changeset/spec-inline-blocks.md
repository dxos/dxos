---
'@dxos/deus': minor
'@dxos/plugin-code': minor
'@dxos/plugin-debug': minor
'@dxos/plugin-presenter': minor
'@dxos/plugin-projects': minor
---

A spec's text is the only store for its blocks. plugin-projects draws each block of a kind its dialects define as a form over that kind's schema, offers a slash command per kind, and reads and writes blocks with `ProjectOperation.GetSpecBlocks`, `SetSpecBlock` and `DeleteSpecBlock`. Specs nest in the nav tree beneath the specs that cite them. In plugin-code a feature is a `feat` block: the canvas, the board and the feature companion read the blocks through `ProjectHooks.useSpecBlocks`, and tasks and showcases name a feature by its block key through `SpecItem.Implements` and `Showcase.Demonstrates` with `item`. A migration folds existing feature objects into their specs' text.

Breaking:

- plugin-code's feature operations (`CreateFeature`, `UpdateFeature`, `DeleteFeature`, `AddFeatureDependency`, `RemoveFeatureDependency`, `LinkFeatureTask`, `GetFeatures`, `ImportSpecFeatures`, `ExportSpecFeatures`, `ImportFeatureLinks`) are removed. Use the block operations, `CodeOperation.CreateSpec` with `breaks`, `UpdateSpec`, `LinkTask` and `CreateShowcase` with `items`.
- The feature embeds, `/feature`, the feature article and the spec codec are removed; a spec syncs with its file as text.
- `@feature` code links are no longer stored on features.
