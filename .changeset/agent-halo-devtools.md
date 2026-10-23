---
'@dxos/edge-client': minor
'@dxos/devtools': minor
'@dxos/plugin-devtools': minor
---

DevTools has an Agent › HALO page: pick one of the agents you administer to see its identity, its admins, the spaces it is in and every credential in its HALO, read from EDGE with the new `EdgeHttpClient.getAgentHalo`. EDGE answers the agent's admins only. `@dxos/devtools` exports the page as `AgentHaloArticle` and the credentials table it shares with HALO › Credentials as `CredentialsTable`, which now leads with the credential's type and shows its id and issuer as hex rather than `[object Object]`. `JsonView` renders buf public keys and bigint timestamps, so a selected credential's details no longer fail with "Do not know how to serialize a BigInt".
