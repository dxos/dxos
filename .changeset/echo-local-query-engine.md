---
'@dxos/echo': minor
---

Live queries now answer from loaded objects before a write returns and check every index answer against local state: traversal hits are revalidated by the edges that reached them, aggregate counts follow local writes, property orders apply across local and index results, and feed writes appear at once. Query entries gain `resolution.version` and `resolution.verified`, the host answers from its index copies instead of loading documents where it can, and `markMilestone` in `@dxos/util` draws startup milestones on the DevTools timeline.
