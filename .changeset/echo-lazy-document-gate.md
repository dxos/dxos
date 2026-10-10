---
'@dxos/echo-client': minor
'@dxos/echo-doc': minor
'@dxos/react-client': minor
---

An object a lazy query backed by the index's copy has no document until something needs it. `Doc.isLoaded` and `Doc.load` check and load it, `useDocAccessor` returns an accessor once it has loaded, and `isDocumentLoaded` reports it from `@dxos/echo-client`. Reading the document of an unloaded object (cursors, heads, history) throws `DocumentNotLoadedError`; branch operations load it first.
