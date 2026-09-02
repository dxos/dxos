---
'@dxos/echo': patch
---

Operations invoked through `invokePromise` are now traced on the runtime's tracer instead of Effect's native one, so their spans reach the observability backend and nest under the caller's span rather than each opening its own trace.
