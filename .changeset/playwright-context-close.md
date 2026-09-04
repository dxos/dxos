---
'@dxos/test-utils': patch
---

`setupPage` now returns a `close()` that disposes the browser context it created. Closing only the page left the context open, and Playwright re-serialized every live context into each later trace until the writer exceeded V8's string limit and left a truncated `trace.zip` behind.
