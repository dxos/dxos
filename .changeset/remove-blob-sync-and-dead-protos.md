---
'@dxos/protocols': minor
'@dxos/client-services': minor
---

Remove the `@dxos/teleport-extension-object-sync` package and the blob-sync teleport extension it
implemented (peer-to-peer sync of opaque binary blobs), which had no active feature depending on
it. `SpaceManager`/`SpaceProtocol` no longer accept or thread a `blobStore` option, and
`DevtoolsHost.getBlobs` (and the devtools "Blobs" panel) are removed along with the underlying
`dxos.echo.blob`/`dxos.mesh.teleport.blobsync` protobuf definitions. Also deletes 22 other
protobuf `.proto` files under `@dxos/protocols` (KUBE/DXNS/bot-daemon/pre-Automerge-era message
and service definitions) confirmed to have zero consumers anywhere in the codebase.
