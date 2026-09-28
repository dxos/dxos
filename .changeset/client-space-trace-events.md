---
'@dxos/client-protocol': minor
'@dxos/client': minor
'@dxos/observability': minor
---

Report spaces and invitations as product events however they start. The client emits `client.space.create`, `client.invitation.create`, `client.invitation.admit` (once per admitted guest) and `client.invitation.accept` on the `trace.events` channel, for both space and device invitations; resumed invitations are not reported again. `spaces.create` takes an `origin` option, so spaces the app makes for itself can be marked `system`. The new `ObservabilityProvider.SpaceEvents` data provider reports them as `space.create`, `space.share`, `space.admit`, `space.join`, `identity.device.invite`, `identity.device.admit` and `identity.join`.
