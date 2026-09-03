---
'@dxos/compute-runtime': patch
---

A crashed process is now reported at `error` level instead of `debug`, and the deferred-failure path (`ctx.fail`) reports at all — it previously transitioned to `FAILED` without logging anything about the cause.

The log carries the failing `Error`/defect itself rather than only `Cause.pretty` text, so the record keeps the message, stack, and nested causes that `Cause.pretty` flattens away. This is what a user-submitted debug bundle needs to explain a crashed agent turn: before this, such a session produced no error-level line at all.
