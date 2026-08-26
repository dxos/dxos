---
'@dxos/echo-protocol': minor
'@dxos/echo-host': minor
'@dxos/credentials': minor
'@dxos/client-services': minor
'@dxos/protocols': minor
---

Anchor spaces on a space root document, behind `DX_AUTOMERGE_CREDENTIALS`.

Off by default: a space keeps its key-derived id and its hypercore control feed, as before.
Setting `DX_AUTOMERGE_CREDENTIALS=1` (config `runtime.client.automergeCredentials`) opts a client
in, and then a new space takes its id from an immutable root document rather than from the space
key and carries it in `SpaceMetadata.space_id`, credentials are mirrored into a credentials
document, and a legacy space is migrated onto a root when it loads, keeping its id.
`SpaceMember` credentials gain `space_root_url`, so an admitted member can find the root from its
admission alone. `createSpace` still takes `useSpaceRootDocument` to override the flag per space.
