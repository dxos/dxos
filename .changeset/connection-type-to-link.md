---
'@dxos/link': minor
'@dxos/plugin-connector': minor
---

Move the `Connection` type and the Atmosphere connector constants to `@dxos/link`, alongside `AccessToken` and `Cursor`. `Connection` is no longer exported from `@dxos/plugin-connector`; import it from `@dxos/link`, and read `ATMOSPHERE_PROVIDER_ID` / `ATMOSPHERE_SOURCE` as `Atmosphere.PROVIDER_ID` / `Atmosphere.SOURCE`.
