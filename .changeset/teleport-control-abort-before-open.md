---
'@dxos/teleport': patch
---

Fixed a `TypeError: Cannot read properties of undefined (reading 'abort')` thrown from `ControlExtension.onAbort` when a Teleport session is aborted while its handshake is still in flight.

`Teleport` registers the control extension before opening it, and `abort()`/`destroy()` invoke the lifecycle hooks of every registered extension — so an abort racing `onOpen` (for example a swarm renegotiating and closing the connection from `Peer.onOffer`) reached `this._rpc.abort()` before `_rpc` had been assigned. The RPC peer and extension context are now optional-typed and guarded in `onAbort`, `onClose`, the context error handler and the heartbeat's `RpcClosedError` branch, matching the pattern `RpcExtension` already used. The thrown error previously masked the real reason the connection was closing.
