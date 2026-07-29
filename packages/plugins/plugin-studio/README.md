# @dxos/plugin-studio

A studio for creative artifacts in DXOS Composer.

An `Artifact` is a media-agnostic unit of creative work — a prompt
(`Instructions`) paired with the `Variant`s generated (or uploaded) from it,
discriminated by an open-string `kind` (`'image' | 'video' | …`). The plugin
owns the cross-cutting ontology (`Artifact` / `Variant` / `Generation`) and the
generic authoring UI; concrete media plug in as overridable `VariantRenderer`
surfaces (keyed by `contentType`), and providers register a `GenerationService`
per kind (each carrying its own request schema). Providers such as
`@dxos/plugin-ideogram` manage credentials via the Connector system.

Galleries reuse existing types: a masonry gallery is a `Collection<Artifact>`;
Artifacts also render as cards (`CardContent`) so they compose into
collections/boards laid out by the host.

See [`PLUGIN.mdl`](./PLUGIN.mdl) for the specification.
