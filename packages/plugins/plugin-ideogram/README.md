# @dxos/plugin-ideogram

Headless DXOS Composer plugin that makes [ideogram.ai](https://ideogram.ai)
available as an image-generation provider for `@dxos/plugin-illustrator`.

It contributes:

1. A **Connector** entry (`source: "ideogram.ai"`) with an API-key credential
   form, so the user connects Ideogram through the generic Connector UI.
2. An **`ImageGenerationService`** implementation (the abstraction owned by
   `@dxos/plugin-illustrator`) that calls the Ideogram HTTP API.

No React/UI surfaces. See [`PLUGIN.mdl`](./PLUGIN.mdl) for the specification.
