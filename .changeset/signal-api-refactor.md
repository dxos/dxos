---
'@dxos/messaging': minor
---

Unify the signaling `sendMessage`/`sendBroadcast` methods and encapsulate message-subscription routing.

Breaking:

- `SignalMethods.sendMessage(ctx, message)` now handles both point-to-point and swarm-broadcast (DX-1125) delivery. A message carries exactly one of `recipient` (point-to-point) or `tags` (broadcast, targeting the swarm in `author.swarmKey`); `Message.recipient` is now optional. The separate `sendBroadcast` method is removed.
- `subscribeMessages({ peer, tags?, onMessage })` now takes the delivery callback, encapsulates routing (point-to-point by recipient, broadcasts by tag intersection), and returns an unsubscribe callback that owns the subscription lifecycle. The standalone `unsubscribeMessages` method and the `onMessage`/`onBroadcast` events are removed.
- The `@dxos/signal` package (the KUBE signal-server test harness) has been removed; tests now use `MemorySignalManager`.
