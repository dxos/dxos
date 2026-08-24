---
'@dxos/echo-protocol': minor
'@dxos/echo-host': minor
'@dxos/credentials': minor
'@dxos/client-services': minor
'@dxos/protocols': minor
---

Anchor spaces on a space root document.

New spaces take their id from an immutable root document rather than from the space key, and
carry it in `SpaceMetadata.space_id`; pass `useSpaceRootDocument: false` to `createSpace` for a
legacy key-derived space. `SpaceMember` credentials gain `space_root_url` so an admitted member
can find the root from its admission alone, and legacy spaces are migrated onto a root
transparently when they load, keeping their id.
