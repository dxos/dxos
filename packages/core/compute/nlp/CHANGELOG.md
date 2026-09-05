# @dxos/nlp

## 0.12.0

### Minor Changes

- 32468c3: Lingo: a plugin for reading in a language you are learning — word lists, a Leitner flashcard drill,
  and a reading companion that translates a passage and reveals its structure inline.

  `@dxos/nlp` gains `Segment`/`Segmentation` and a hierarchical aligner: one cheap-model call returns
  nested regions quoted verbatim and character offsets are computed deterministically from those
  quotes.

  A magazine Post is now readable through `TextContent`, so the reading companion (and any other
  text consumer) reaches it without knowing the type exists. An unbound mailbox no longer lists system
  folders it cannot fill, and its Analyze action waits for the first completed sync. The flat-deck
  companion's open state is now deck-wide rather than per plank.

### Patch Changes

- Updated dependencies [8363f12]
- Updated dependencies [9477170]
- Updated dependencies [b2d5bb2]
- Updated dependencies [49aee6c]
- Updated dependencies [3e02201]
- Updated dependencies [578b543]
  - @dxos/ai@0.12.0

## 0.11.1

### Patch Changes

- @dxos/ai@0.11.1

## 0.11.0

### Patch Changes

- Updated dependencies [bdf9f68]
  - @dxos/ai@0.11.0
