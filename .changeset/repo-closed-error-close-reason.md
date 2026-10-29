---
'@dxos/echo-client': patch
---

`RepoClosedError` now says what stopped the repo proxy. Its `closeReason` context is the reason the closer gave, read from the `CLOSE_REASON_ATTRIBUTE` attribute of the `Context` passed to `close()` (`'closed'` when none is given), or `'error'` when an error put the proxy in its error state. Its `cause` is that error, or one whose stack is the `close()` call site. The proxy logs once when it stops: at info for a close that gave a reason or an error, at debug for a plain close. `EchoClient`, `DatabaseImpl` and `EntityManager` pass their close context down to the proxy.
