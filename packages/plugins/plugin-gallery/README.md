# @dxos/plugin-gallery

A simple image gallery plugin for DXOS Composer.

A `Gallery` ECHO object holds an array of images referenced by URL —
either an external `http(s)://` URL or a `wnfs://` URL backed by the
`@dxos/plugin-wnfs` `FileUploader` capability.

## Features

- Add images from your local filesystem (uploaded to WNFS).
- Masonry layout of image cards with hover-to-delete.
- Fullscreen "Show" mode via `plugin-deck`'s `solo--fullscreen`.
- `describeImage` operation to populate alt-text descriptions.

See [PLUGIN.mdl](./PLUGIN.mdl) for the full specification.
