---
'@dxos/plugin-ibkr': patch
---

Report the real cause of Interactive Brokers Flex fetch failures. A non-XML response (proxy error page, empty body) was parsed for an error code that was never there and surfaced as `IBKR GetStatement failed: undefined`; the HTTP status and a body snippet are now included, and a single unrecognized poll response no longer aborts a sync that is otherwise on track.
