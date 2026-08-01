---
'@dxos/client': patch
---

Fix device invitations from bun-hosted CLI peers: bump node-datachannel to 0.32.3 (the 0.30.0 darwin-arm64 binary crashed under bun and node) and remove the obsolete bun memory-transport guard so the CLI uses real WebRTC transport.
