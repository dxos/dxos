---
'@dxos/echo': minor
---

Feeds can branch: `Feed.append(feed, items, { fork })` starts a branch at an earlier item, `{ branch }` adds to one, and `Feed.readBranch` reads a branch with its ancestors up to each fork point. `Feed.query` and `Scope.feed` take `branches` (branch ids, `null` for main, or `'all'`); a feed read with no branch filter now covers only the main branch, and `IndexingOptions.mode` (`'main'` by default, or `'all'`) sets which branches the index holds. Feeds written before this change have no branches, so their reads are unchanged.
