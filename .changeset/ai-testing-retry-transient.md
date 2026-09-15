---
# multiple-changesets: found running the chess-MCP eval; the testing preset is @dxos/ai's, the eval is not
'@dxos/ai': patch
---

The direct testing preset retries a transient provider response, so a 5xx twenty minutes into a long scenario no longer ends it.
