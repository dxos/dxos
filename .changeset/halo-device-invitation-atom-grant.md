---
'@dxos/halo': minor
'@dxos/plugin-client': minor
---

Completes the HALO consumer-migration surface: no plugin reaches for `@dxos/client` to do HALO work anymore.

- **`useInvitationFlow(flow)`** (`@dxos/halo-react`) renders any `Invitation.Flow` — its latest lifecycle event plus the shareable code — replacing a subscription to the client's `CancellableInvitationObservable`. The code is re-emitted with each event so a rendered QR and the flow state cannot tear.
- **`Identity.DeviceInfo` gained `presence`, `os`, `platform`, and a populated `kind`**, which is what a device list needs to show status, name, and icon. `@dxos/shell`'s `DeviceListItem` now accepts the structural `ShellDevice` that `DeviceInfo` satisfies, so a HALO-backed caller renders it directly; shell's own client-backed `DeviceList` maps through the newly exported `toShellDevice`.
- **`ClientOperation.GrantServiceAccess`** (`{ serverName, capabilities }`) wraps the existing `Identity.grantServiceAccess` verb so a component can grant EDGE/Hub access without the client's credential-write surface.
- **`Identity.atom(service)`** is an `Atom<Option<Info>>` for reactive non-React consumers (app-graph builders), seeded from `getSnapshot()` and updated through `subscribe()`, keyed by service reference.

plugin-client's `DevicesContainer` and app-graph-builder, and plugin-script's settings surface, use these. `DevicesContainer` keeps `useClient`/`useNetworkStatus` only for swarm status and the `DX_ENVIRONMENT` log gate — config and mesh access, not identity.
