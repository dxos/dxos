---
'@dxos/devtools': minor
---

The devtools Objects panel has a new layout. Objects can be shown as a tree with icons, a table, or a force graph, chosen with a toolbar toggle. All three are filtered with the same query language the mailbox and task lists use (`type:`, `#tag`, free text, `{ prop: value }`). The selected object's properties appear in a property tree that opens two levels deep. A reference shows the target's icon and name, and clicking the name selects that object. Opening a reference loads its target's properties in place, one level at a time. The edit history lists changes newest first, and selecting a version shows the object, and any blob preview, as it was at that version. Blobs, and objects that reference a blob, open a third column that renders images, PDFs, audio and video, and text.

New exports: `PropertyTree`, `BlobPreview`, `findBlob` and `ObjectsGraph`. `ObjectsTree` takes two new props, `ids` and `selected`. `matchesFilter` in `@dxos/echo-query` now accepts any entity, so a query can match relations as well as objects.
