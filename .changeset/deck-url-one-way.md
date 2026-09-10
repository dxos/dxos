---
'@dxos/plugin-deck': minor
'@dxos/plugin-navtree': minor
'@dxos/plugin-client': patch
'@dxos/app-toolkit': minor
'@dxos/app-graph': minor
---

The URL is now the deck's only record of what is open, and the relationship between the two is one-way: an operation computes a target and pushes the URL, the URL is projected into deck state, the deck renders. Nothing else writes what is open. This replaces a bidirectional sync between the address bar and persisted deck state that needed five separate guards to referee it, and whose failures cleared the URL on reload.

A URL resolves asynchronously, so the projection applies it twice: once synchronously by the pairs themselves, so the planks the URL names render their chrome immediately, and again once each pair has resolved to a graph node. Per-plank preferences and the closed-plank record hang off a plank's URL segment rather than its id, so they survive that refinement. A plank whose node has no URL binding cannot be opened and is logged with the extension that produced it.

Breaking for plugin authors: `LayoutOperation.Open`'s `navigation` option is no longer read, a node needs a `url` binding on its graph-builder extension to be openable as a plank, and the pinned workspaces lost their `!` id prefix. A plugin's own workspace is now named the way a plugin should name one, by its namespace: `dxos:settings`, `dxos:registry` and `dxos:account`. No space id can collide with a name of that shape, so the namespace is what keeps two plugins from claiming the same workspace.
