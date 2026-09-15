---
'@dxos/plugin-studio': patch
'@dxos/echo': patch
---

Studio and adjacent plugins.

- **Video generation references an image artifact.** A Higgsfield video request requires `imageArtifact` — a generated image `MediaArtifact` whose cover the DoP model animates — instead of an `imageUrl` / hidden still-generation step; an optional `duration` (seconds) is sent to the models that take one (Kling, Hailuo, Wan) and validated against each family's accepted lengths. The video model list gains those families. The form renders the reference as an artifact picker (`ArtifactRefField`), and request fields annotated `GenerationService.FileUrlAnnotation` render an upload button through the `FileUploader` capability.
- **Provider options cache is keyed by kind**, so an image and a video service of one provider list their own models (the cause of a video form showing image models, and of a 422 `image_url` on image generation). A request composed for another generator no longer seeds the draft.
- **Play is a graph action** on the storyboard node, flipping a `StoryboardView` view-state flag; `PlayControl` is gone.
- **Media artifact card** is a poster body under the host's card header; the lightbox titles its cells and renders them through the `CardContent` surface. Lightbox cells persist `w`/`h` (legacy `width`/`height` normalized on read).
- **Connector credential forms**: shared `ConnectorSpec.TokenForm` / `KeyPairForm`; `TypeFormat.Key` renders an opaque identifier in a monospace field without spellcheck.
- **Projects**: the article's tab and pipeline toggle are attention view state; a session working a single task is one timeline lane; a run whose process ended without a request end closes at its last event, and the axis follows `now` only for a fresh open lane. `Repo` is registered with a create entry, so a project's repository ref offers create.
- **Chat**: an object embedded in a message (`![label](echo://…)`) renders as its card; the scroll-to-bottom button hides while the list follows the tail itself.
- **Tasks**: the edit pane's description scrolls past eight lines and spans the row; a text filter on the task set article's toolbar; a task row's pull-request chip carries the same icon as the editor's (link resolvers can name an icon).
- **Picker** claims Escape only while it has a query to clear, so an enclosing dialog dismisses.
