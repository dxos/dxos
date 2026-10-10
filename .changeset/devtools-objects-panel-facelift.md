---
'@dxos/devtools': minor
---

The devtools Objects panel gets a new layout. Objects show as a tree with icons, a table, or a force graph, and you switch between them with a toolbar toggle. The panel is filtered with the same query language the mailbox and task lists use (`type:`, `#tag`, free text, `{ prop: value }`). The selected object's properties appear in a property tree, where references can be opened in place one level at a time, and its edit history lists changes newest first; selecting a version shows the object as it was then. Blobs, and objects that reference a blob, open a third column that renders the content: images, PDFs, audio and video, and text. New exports: `PropertyTree`, `BlobPreview`, `findBlobRef` and `ObjectsGraph`. `ObjectsTree` takes two new props, `ids` and `selected`. `matchesFilter` in `@dxos/echo-query` now takes any entity, so a query can match relations as well as objects.
