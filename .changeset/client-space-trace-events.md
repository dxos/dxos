---
'@dxos/client-protocol': minor
'@dxos/client-services': minor
'@dxos/client': minor
'@dxos/observability': minor
---

Report spaces and invitations as product events however they start. On the `trace.events` channel, the client emits `client.space.create` and `client.invitation.create` (resumed invitations are not reported again), and the invitation services emit `client.invitation.admit` for each guest a host admits and `client.invitation.accept` when a guest is admitted, so each success is reported once across tabs and reloads. Events cover both space and device invitations. `spaces.create` takes an `origin` option (`unknown` when not given) that `space.create` carries as a property; the app's own default, settings and mirror spaces pass `system`, and the space plugin's create operation passes the origin it was invoked under. The new `ObservabilityProvider.SpaceEvents` data provider reports them as `space.create`, `space.share`, `space.admit`, `space.join`, `identity.device.invite`, `identity.device.admit` and `identity.join`.
