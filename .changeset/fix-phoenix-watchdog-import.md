---
'@dxos/phoenix': patch
---

Fix the daemon watchdog failing to start with `ERR_MODULE_NOT_FOUND` after the vite/rolldown build migration by importing from the correct `dist/lib` entrypoint.
