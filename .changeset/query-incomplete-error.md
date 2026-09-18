---
'@dxos/echo-client': patch
---

A one-shot query no longer returns a short result when index hits fail to hydrate. A hit whose load runs out of budget is retried once and then reported as a `QueryIncompleteError` naming it, so a caller that reads a result as the whole set — an agent or an MCP tool, which unlike a reactive query gets no second pass — can no longer mistake missing objects for objects that do not exist. A hit the loader positively establishes is gone (deleted elsewhere, released, or behind a document url that no longer resolves) is still dropped, since a stale index entry is not an incomplete answer.
