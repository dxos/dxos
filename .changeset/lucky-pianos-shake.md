---
'@dxos/plugin-client': patch
'@dxos/app-toolkit': patch
---

Pin the WebAuthn relying party to `composer.space` for deployed builds so recovery passkeys created at labs/staging are accepted by the hub. Existing passkeys created at `labs.composer.space` are orphaned and must be re-created.
