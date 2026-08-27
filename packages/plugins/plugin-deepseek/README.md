# @dxos/plugin-deepseek

Headless DXOS Composer plugin that lets the user connect their
[DeepSeek](https://platform.deepseek.com) account by pasting an API key.

It contributes a single **Connector** entry (`source: "deepseek.com"`) with an
API-key credential form, rendered by the generic Connector UI. On submit the key
is stored as an `AccessToken` plus a `Connection` in ECHO, resolvable by other
plugins through `CredentialsService`.

No React/UI surfaces. See [`PLUGIN.mdl`](./PLUGIN.mdl) for the specification.
