---
'@dxos/echo': patch
---

`@dxos/echo-memory` no longer depends on `n3`. Its RDF/JS terms and data factory are the new `Rdf` module and TriG is written by the new `Trig` module (output unchanged), so the memory core loads under workerd's `nodejs_compat`, where n3's `readable-stream` does not. Functions that took or returned n3 terms now use the standard `@rdfjs/types` interfaces, which n3 terms still satisfy.
