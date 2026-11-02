---
'@dxos/echo': minor
---

Feeds can branch. `Feed.fork(feed, items, { at })` starts a branch at an earlier item and returns its `Feed.BranchId` (the block id of the branch's first block); `Feed.append(feed, items, { branch })` continues one. Items read from a feed carry `Feed.getBranch`, `Feed.isFork`, `Feed.getBlockId` and `Feed.getPredecessor`, and `Feed.readBranch` reads a branch with its ancestors up to each fork point.

A walk reads a feed in local order along the path from the root branch to a branch, forward or backward, with fork points on request: `Scope.feed(uri, { walk: { branch, forks } })` with `Filter.feedCursor({ begin, positions: 'local' })` and `Order.natural('asc' | 'desc')`, or the `Feed.walk` wrapper. Each item comes once, at the place of its first block, with its latest content. `Feed.getLocalCursor` of the last item resumes the next page.

`Feed.query` and `Scope.feed` take `branches` (branch ids, `null` for the root, or `'all'`); a feed read with no branch filter covers only the root branch, and `IndexingOptions.mode` (`'main'` by default, or `'all'`) sets which branches the index holds. Feeds written before this change have no branches, so their reads are unchanged.
