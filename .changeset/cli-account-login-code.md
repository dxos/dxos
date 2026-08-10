---
'@dxos/protocols': minor
'@dxos/plugin-client': minor
---

The CLI can issue and redeem invitation codes. The hub no longer exempts any address from its invitation gate, so a code is now the only way to create an account from the CLI.

- `dx account invitation create` issues a code against the logged-in account's own quota.
- `dx account login --code <CODE>` (email method) redeems one; omit the option to recover an existing account.

`LoginRequest` gains an optional `code` field, sent on both the identity probe and the retry that redeems it.
