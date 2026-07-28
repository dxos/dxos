---
'@dxos/plugin-client': minor
'@dxos/cli-util': minor
---

Add `dx account signup <code>`, which validates an access code and then signs up with either email or an Atmosphere (atproto) OAuth account, mirroring Composer's sign-up flow. The `--method` name for the atproto OAuth path is now `atmosphere` in both `signup` and `login`, matching Composer's wording; `--method atproto` is still accepted as an alias.
