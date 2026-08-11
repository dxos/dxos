---
'@dxos/plugin-client': minor
---

`dx account invitation create` issues an invitation code against the logged-in account's own quota. The hub no longer exempts any address from its invitation gate, so a code is the only way to create an account from the CLI — redeem one with `dx account signup <CODE>`.
