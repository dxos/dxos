---
'@dxos/echo-client': patch
---

A one-shot query no longer returns a short result when index hits fail to hydrate. Hits that do not load are retried once and then reported as a `QueryIncompleteError` naming them, so a caller that reads a result as the whole set — an agent or an MCP tool, which unlike a reactive query gets no second pass — can no longer mistake missing objects for objects that do not exist.
