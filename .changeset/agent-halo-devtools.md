---
'@dxos/edge-client': minor
'@dxos/plugin-agent': minor
'@dxos/devtools': patch
---

The debug panel has an Agents page: pick an agent you administer to see its identity, its admins, the spaces it is in and every credential in its HALO, read from EDGE with the new `EdgeHttpClient.getAgentHalo`. Devtools exports the credentials table it shows them in as `CredentialsTable`, which now leads with the credential's type and shows its id and issuer as hex rather than `[object Object]`. `JsonView` renders buf public keys and bigint timestamps, so a selected credential's details no longer fail with "Do not know how to serialize a BigInt".
