# @dxos/plugin-higgsfield

A **headless** Composer plugin that makes [Higgsfield](https://higgsfield.ai) available as an
**image** and **video** generation provider for `plugin-studio`. It contributes:

1. A **Connector** (`source: "higgsfield.ai"`) with an API key id + secret credential form, so
   the user connects Higgsfield Cloud through the generic `plugin-connector` UI. The two parts are
   stored as one `AccessToken.token` (`<id>:<secret>`) in ECHO.
2. Two **`GenerationService`s** (kinds `image` and `video`, id `higgsfield`) over one provider
   implementing the asynchronous contract (`enqueue` → `awaitResult`): `POST /<model path>` then
   poll `GET /requests/{request_id}/status`. The kind-specific request config is
   `{ model, prompt }`; the image service defaults the model to `higgsfield-ai/soul/v2/standard`.

The credential is resolved at generation time by `plugin-studio`'s `generate` operation via
`CredentialsService`, keyed by the provider's `source`. Requests are routed through the DXOS edge
CORS proxy (`proxyFetchLegacy`).

See [`docs/DESIGN.md`](./docs/DESIGN.md) for the design and [`PLUGIN.mdl`](./PLUGIN.mdl) for the
specification.
