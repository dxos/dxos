---
'@dxos/protocols': minor
'@dxos/plugin-client': minor
---

`dx account login` accepts an invitation code: `--code <CODE>` (email method). The hub no longer exempts any address from its invitation gate, so a code is now the only way to create an account from the CLI; omit the option to recover an existing one. `LoginRequest` gains an optional `code` field, sent on both the identity probe and the retry that redeems it.
