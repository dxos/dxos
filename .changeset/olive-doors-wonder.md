---
'@dxos/echo-client': patch
---

Stop charging index-query time to document hydration. A one-shot index query's 20s budget covered both the host round-trip and the hydration of every hit, so a single unavailable document failed the whole query as a `Timeout: index query` — naming the index, which had answered in microseconds. The budget now ends at the host's response, each hit is hydrated under its own bound, and a stall is reported as `index query result hydration`, naming the objects that did not load.
