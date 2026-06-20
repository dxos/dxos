# @dxos/plugin-generator

AI-driven media generation plugin for `DXOS` Composer.

`Generation` objects pair a markdown prompt (via a `Ref<Text>`) with a
`type: video | audio` literal and an optional generated `url`. The toolbar's
**Generate** action dispatches the prompt to a `GenerationProvider`; the
default implementation is a HeyGen API adapter. The provider abstraction is
intentionally generic so additional back-ends (Veo, Sora, ElevenLabs, etc.)
can be added without touching the `Generation` data model.

The plugin's Settings panel exposes an API key field used by the active
provider.

See [PLUGIN.mdl](./PLUGIN.mdl) for the full specification.
