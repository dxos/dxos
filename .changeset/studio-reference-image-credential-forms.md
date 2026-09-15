---
'@dxos/plugin-studio': patch
'@dxos/plugin-higgsfield': patch
'@dxos/plugin-connector': patch
'@dxos/echo': patch
'@dxos/react-ui-form': patch
'@dxos/react-ui-board': patch
---

Studio: a video request can reference an image artifact whose cover it animates, and file-backed URL fields (`GenerationService.FileUrlAnnotation`) upload through the FileUploader. Play is a graph action on the storyboard node. Connector: shared `TokenForm`/`KeyPairForm` credential schemas; `TypeFormat.Key` renders opaque identifiers in a monospace field without spellcheck. Fixes: a request composed for another generator no longer seeds the draft (Higgsfield 422 `image_url`), and lightbox cells persist `w`/`h`.
