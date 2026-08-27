# @dxos/blob

The blob storage contract: pluggable content-addressed backends for ECHO.

Bytes that do not belong inside an ECHO object — uploads, images, generated media — are written
through a **backend** registered on the Hypergraph under a storage name, and read back by
dispatching on the URI's scheme. `BlobManager` owns that registry;
`@dxos/echo-client`'s `graph.registerBlobBackend(name, backend, { default? })` is how one is added.

| Custody | Storage name | Scheme | Example reference |
| --- | --- | --- | --- |
| In the object | `inline` | none | bytes on the object |
| DXOS-hosted | `edge` | `ni:` | `ni:///sha-256;UyaQNQIUxQKgg1jVMKMbg1Yr8Rrb2Y3RaOx2N0mVJhc` |
| Bring-your-own endpoint | `s3` | `s3:` | `s3://media.abc123.r2.cloudflarestorage.com/SPACEID/deadbeef` |
| Space-local / peer | `wnfs` | `wnfs:` | `wnfs://spaces/<spaceId>/files/<cid>` |

## Backends take capabilities, not clients

A backend declares the narrow interface it needs rather than accepting a client class — the hosted
store takes a `BlobTransport` (four operations), S3 takes an `S3Host` (credential and endpoint
resolution). This is what lets the same backend register in a browser, in a headless worker with no
`Client`, or in a test with a plain object.

## Status

This package currently holds the contract. The registry, URI encoding, and the backends themselves
still live in `@dxos/echo-client` and `@dxos/client`; moving them here is tracked in
[the design doc](../echo-client/src/blob/DESIGN.md), along with the `edge`/`ni:` → `blob` rename.
