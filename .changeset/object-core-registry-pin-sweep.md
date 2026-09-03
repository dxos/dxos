---
'@dxos/echo-client': patch
'@dxos/plugin-debug': patch
---

Object core pinning no longer installs a timer per registry touch — a single sweep timer expires pins by monotonic last-touch timestamp, removing the dominant timer churn of a bulk object load. The debug plugin's schema table now owns the generator promise it starts: the row shows the work in flight, refuses a concurrent click, and reports a failure instead of leaving it unhandled.
