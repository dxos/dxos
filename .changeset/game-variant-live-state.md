---
'@dxos/plugin-markdown': patch
---

Fix "Cannot assign to read only property" when playing a game — game variants now receive the live state object instead of a frozen snapshot, so chess moves and New Game work again. Tic-Tac-Toe now ships from the community plugins repo and is no longer built here.
