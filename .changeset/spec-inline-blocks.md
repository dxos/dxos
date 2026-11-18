---
'@dxos/app-toolkit': minor
'@dxos/deus': minor
'@dxos/plugin-code': minor
'@dxos/plugin-debug': minor
'@dxos/plugin-markdown': minor
'@dxos/plugin-presenter': minor
'@dxos/plugin-projects': minor
'@dxos/react-ui': minor
'@dxos/react-ui-editor': minor
'@dxos/react-ui-form': minor
'@dxos/react-ui-menu': minor
'@dxos/ui-editor': minor
'@dxos/ui-types': minor
---

A spec's text is the only store for its blocks. plugin-projects draws each block of a kind its dialects define as a form over that kind's schema, offers a slash command per kind, and reads and writes blocks with `ProjectOperation.GetSpecBlocks`, `SetSpecBlock` and `DeleteSpecBlock`. The Specs tab's spec picker nests a spec beneath the specs whose `Ref<spec>` fields cite it. In plugin-code a feature is a `feat` block: the board and the feature companion read the blocks through `ProjectHooks.useSpecBlocks`, and tasks and showcases name a feature by its block key through `SpecItem.Implements` and `Showcase.Demonstrates` with `item`. A migration folds existing feature objects into their specs' text.

The Specs tab has one toolbar, and every Markdown editor's toolbar groups its tools into Format and Insert, which show their buttons while there is room and fold into menus before anything moves into ⋮. A guided tour step opens the folded group that holds its control. Shared form and picker parts gained what the block forms use: inline labels, header grids, typed array rows, lookups of several values, option details and hues.

Breaking:

- plugin-code's feature operations (`CreateFeature`, `UpdateFeature`, `DeleteFeature`, `AddFeatureDependency`, `RemoveFeatureDependency`, `LinkFeatureTask`, `GetFeatures`, `ImportSpecFeatures`, `ExportSpecFeatures`, `ImportFeatureLinks`) are removed. Use the block operations, `CodeOperation.CreateSpec` with `breaks`, `UpdateSpec`, `LinkTask` and `CreateShowcase` with `items`.
- The feature embeds, `/feature`, the feature article and the spec codec are removed; a spec syncs with its file as text.
- `@feature` code links are no longer stored on features.
- A read-only Boolean form field is no longer dimmed, and a `Select` shown as a tag is filled in its option's hue.
