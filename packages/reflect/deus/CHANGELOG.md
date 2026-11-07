# @dxos/deus

## 0.17.0

### Patch Changes

- a8e68c5: A spec's features are embedded in its document as `![name](echo:///id)`, drawn as editable sections, and the text decides which features the spec holds and in what order. `/feature` at the end of a paragraph makes it a feature, and moving, deleting or undoing an embed does the same to the feature. Every feature gets a block id (`F-n`) and every requirement an id under it as soon as it exists, and ids are kept when features move. The local and GitHub file syncs read and write `feat` blocks through the new `SpecDocumentCodec` capability, and export rewrites only the blocks that changed. Breaking: `Feature` is now 0.4.0, and its `specs` field moved to meta foreign keys (`Feature.getSources`, `Feature.getBlockId`), with a migration. `deus changelog check` reads a fence holding several decisions as one entry each. `StubWidget` no longer accepts another widget's DOM, which kept a kept-alive widget from rendering twice.
- @dxos/errors@0.17.0

## 0.16.0

## 0.15.0

## 0.14.0

## 0.13.0

## 0.12.0

## 0.11.1

## 0.11.0
