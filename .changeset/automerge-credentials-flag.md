---
'@dxos/client-services': patch
'@dxos/protocols': patch
---

Gate the automerge-backed credential scheme behind `DX_AUTOMERGE_CREDENTIALS`.

Spaces keep their key-derived id and their hypercore control feed by default. Setting
`DX_AUTOMERGE_CREDENTIALS=1` (config `runtime.client.automergeCredentials`) opts a client into
anchoring spaces on a space root document, mirroring credentials into a credentials document, and
migrating legacy spaces on open.
