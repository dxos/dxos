---
'@dxos/pipeline-rdf': minor
'@dxos/plugin-agent': minor
'@dxos/ui-editor': minor
'@dxos/react-ui': patch
---

The agent's fact graph can be browsed as entity cards, with Turtle and TriG highlighted in the editor.

- `@dxos/plugin-agent`: `EntityCard` shows one entity of the fact graph (its type, name, properties, and the properties pointing at it, with chips coloured by type), and `EntityBrowser` explores the graph as Finder-style columns, each with a filter, a close action and arrow-key navigation.
- `@dxos/pipeline-rdf`: `Predicate.label` writes a predicate or an inverse in one display form, lowercase kebab-case (`works-at`, `known-by`).
- `@dxos/ui-editor`: `turtle()` highlights RDF 1.1 Turtle and TriG (prefixes, IRIs, prefixed names, blank nodes, literals with language tags and datatypes, graph blocks).
- `@dxos/react-ui`: a chosen card in a keyboard stack (a `Focus.Item`) shows the current surface rather than the accent border, so the focus ring is the only edge it draws.
