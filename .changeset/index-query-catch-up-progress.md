---
'@dxos/echo-client': patch
---

A one-shot index query no longer times out with `Timeout [20,000ms]: index query` while the host catches up its index after time offline: index catch-up and full-text activity now restart the query's budget, as rebuilds and migrations already did.
