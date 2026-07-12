# @dxos/plugin-image

Image-creation plugin for DXOS Composer.

An `ImageArtifact` pairs a prompt (`Instructions`) with an ordered set of
generated images. The plugin defines the provider-agnostic
`ImageGenerationService` abstraction; concrete providers (e.g.
`@dxos/plugin-ideogram`) register an implementation and manage credentials
via the Connector system.

See [`PLUGIN.mdl`](./PLUGIN.mdl) for the specification.

> This plugin supersedes `@dxos/plugin-gallery`, which is slated for removal
> after phase 1.
