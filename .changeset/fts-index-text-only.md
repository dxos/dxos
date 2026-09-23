---
'@dxos/index-core': minor
---

Full-text search matches an object's text content instead of its JSON. Indexing the JSON made
every property name a search term, so `title` or `name` matched any object that merely had such a
field, and under a trigram tokenizer any 3-character window of a key (`des` of `description`)
matched too. The index now stores only the string values an object contains — property names,
identifiers, typenames, reference URIs and numbers are dropped — and rebuilds itself on first open
after the upgrade.
