# @dxos/deus

## 0.17.0

### Minor Changes

- c637062: `deus review` now judges a worker spec's `binding`, `actor`, `route`, `keyspace` and `table` blocks. Each is a review item named `<kind>:<id>` (`binding:DATA_SERVICE`, `table:feeds`), as the spec cites it; `review check` accepts those verdicts and points a bare id at the qualified one, and the spec viewer marks the blocks with their verdicts.
- 21a8ea6: Add the worker dialect (`lang/worker.mdl`): `binding`, `actor`, `route` and `keyspace` blocks describe a worker's environment bindings and their types, its Durable Objects, its HTTP routes and its key-value state. `deus lint` accepts them, and the spec viewer gives each its own icon and colour.
- 9f2cacf: A spec's text is the only store for its blocks. plugin-projects draws each block of a kind its dialects define as a form over that kind's schema, offers a slash command per kind, and reads and writes blocks with `ProjectOperation.GetSpecBlocks`, `SetSpecBlock` and `DeleteSpecBlock`. The Specs tab's spec picker nests a spec beneath the specs whose `Ref<spec>` fields cite it. In plugin-code a feature is a `feat` block: the board and the feature companion read the blocks through `ProjectHooks.useSpecBlocks`, and tasks and showcases name a feature by its block key through `SpecItem.Implements` and `Showcase.Demonstrates` with `item`. A migration folds existing feature objects into their specs' text.

  The Specs tab has one toolbar, and every Markdown editor's toolbar groups its tools into Format and Insert, which show their buttons while there is room and fold into menus before anything moves into ⋮. A guided tour step opens the folded group that holds its control. Shared form and picker parts gained what the block forms use: inline labels, header grids, typed array rows, lookups of several values, option details and hues.

  Breaking:

  - plugin-code's feature operations (`CreateFeature`, `UpdateFeature`, `DeleteFeature`, `AddFeatureDependency`, `RemoveFeatureDependency`, `LinkFeatureTask`, `GetFeatures`, `ImportSpecFeatures`, `ExportSpecFeatures`, `ImportFeatureLinks`) are removed. Use the block operations, `CodeOperation.CreateSpec` with `breaks`, `UpdateSpec`, `LinkTask` and `CreateShowcase` with `items`.
  - The feature embeds, `/feature`, the feature article and the spec codec are removed; a spec syncs with its file as text.
  - `@feature` code links are no longer stored on features.
  - A read-only Boolean form field is no longer dimmed, and a `Select` shown as a tag is filled in its option's hue.

- 76b7f2f: A spec's views open in Structure, Decisions and Review companion tabs beside its text, each view ships with the dialect it reads (the software views with plugin-code, the Video package with plugin-video), and a nested spec is picked from the Specs tab's dropdown instead of the nav tree. Breaking: `Spec` moves to 0.4.0 and its migration rewrites a spec's dialects to `org.dxos.spec.software`; `ProjectSurface.Level`, `ProjectSurface.LevelOverview` and `ProjectGraph.makeLevelNode` are removed.

### Patch Changes

- bb2b69f: `space.removeObjects` now works in a space with no root collection, and `space.restoreObjects` accepts `refs`, so a caller outside the process (MCP, EDGE) can restore what it removed. `deus changelog check` accepts a branch that repairs a decision id its base holds twice, by moving a copy, unchanged, to the next free id at the end of the log.
- a8e68c5: A spec's features are embedded in its document as `![name](echo:///id)`, drawn as editable sections, and the text decides which features the spec holds and in what order. `/feature` at the end of a paragraph makes it a feature, and moving, deleting or undoing an embed does the same to the feature. Every feature gets a block id (`F-n`) and every requirement an id under it as soon as it exists, and ids are kept when features move. The local and GitHub file syncs read and write `feat` blocks through the new `SpecDocumentCodec` capability, and export rewrites only the blocks that changed. Breaking: `Feature` is now 0.4.0, and its `specs` field moved to meta foreign keys (`Feature.getSources`, `Feature.getBlockId`), with a migration. `deus changelog check` reads a fence holding several decisions as one entry each. `StubWidget` no longer accepts another widget's DOM, which kept a kept-alive widget from rendering twice.
- @dxos/errors@0.17.0

## 0.16.0

## 0.15.0

## 0.14.0

## 0.13.0

## 0.12.0

## 0.11.1

## 0.11.0
