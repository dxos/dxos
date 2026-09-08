---
'@dxos/client': patch
'@dxos/client-protocol': patch
'@dxos/client-services': patch
---

Move the wire enums (`EdgeReplicationSetting`, `MembershipPolicy`, `SpaceState`, `ConnectionState`,
`DeviceKind`, `DeviceType`) and the remaining `EchoMetadata` decode sites to buf. The enums
`@dxos/client` re-exports (`SpaceState`, `DeviceKind`, `DeviceType`) are now the buf declarations:
their members and values are unchanged, but TypeScript enums are nominal, so code comparing one of
them against the same enum imported from `@dxos/protocols/proto/...` must import it from
`@dxos/protocols/buf/...` instead.
