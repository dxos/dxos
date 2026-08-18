---
'@dxos/config': patch
'@dxos/plugin-client': patch
---

Give the CLI's `main` profile template full parity with Composer's local dev config (edge, ICE, sandbox, IPFS), and auto-default new profiles to it when running the CLI from a monorepo checkout via `DX_LOCAL_DEV`.
