# Deck Refactor

## Phase 1

- [x] Move DeckLayout to `./containers`
- [x] Factor out DeckMain to `./containeres`
  - Remove dependency on `invokePromise` by providing `onLayoutChange` callback.
  - Move ContentEmpty, StatusBar, Topbar as private components to the same DeckMain directory
- [ ] Craete story for `DeckMain`.

- [ ] Create an interface type for Settings panels.
