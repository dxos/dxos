---
'@dxos/echo-client': patch
---

Removed the 2-second per-hit budget on hydrating an index hit. It dropped any object whose load outran it, with only a log line, so a one-shot caller — an agent or an MCP tool, which unlike a reactive query gets no second pass — read the short result as the whole set. The load is now awaited to completion; hits the loader establishes are gone (deleted elsewhere, released, or behind a document url that no longer resolves) are still excluded, as before.
