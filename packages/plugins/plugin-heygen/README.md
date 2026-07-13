# @dxos/plugin-heygen

A **headless** Composer plugin that makes [HeyGen](https://heygen.com) available
as a **video-generation** provider for `plugin-studio`. It contributes:

1. A **Connector** (`source: "heygen.com"`) with an API-key credential form, so
   the user connects HeyGen through the generic `plugin-connector` UI. The key is
   stored as an `AccessToken` in ECHO.
2. A **`GenerationService`** (`kind: "video"`, id `heygen`) implementing the
   asynchronous contract (`enqueue` → `awaitResult`) by calling the HeyGen HTTP
   API and mapping the produced video URL to a `video/mp4` `Variant`. The
   kind-specific request config is `{ avatarId, voiceId }`.

The credential is resolved at generation time by `plugin-studio`'s `generate`
operation via `CredentialsService`, keyed by the provider's `source`. Requests
are routed through the DXOS edge CORS proxy (`proxyFetchLegacy`).

See [`PLUGIN.mdl`](./PLUGIN.mdl) for the specification.
