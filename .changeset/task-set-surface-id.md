---
'@dxos/echo': minor
'@dxos/plugin-markdown': patch
---

Fix the TaskSet article and section surfaces never rendering (the Tasks section of a Project article was empty), and the Excalidraw plugin settings surface never rendering — both surface ids ended in a hyphenated segment, which the surface manager drops. Surface and graph-extension ids are now checked at compile time: `id` on `Surface.create`, `Surface.createWeb`, `GraphBuilder.createExtension` and `createExtensionRaw` takes `DXN.Path`, so a malformed literal is a type error instead of a contribution that silently disappears at dispatch. A computed id still falls through to the existing runtime check.
