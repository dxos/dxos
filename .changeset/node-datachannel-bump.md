---
'@dxos/client': patch
'@dxos/cli': patch
---

Use the WebRTC transport for bun as well as node: bump node-datachannel to 0.32.3 (the 0.30.0 darwin-arm64 binary crashed under both runtimes) and remove the obsolete bun memory-transport guard. CLI `halo share` prints the joinable URL and validates `--host` as an absolute URL.
