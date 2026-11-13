---
'@dxos/pipeline-rdf': minor
---

`RDF.Vocabularies` seeds an ontology with curated predicates from published vocabularies (schema.org, FOAF, Dublin Core, W3C ORG, SIOC) under their own IRIs, and `ExtractOptions.closed` makes the extractor use only listed predicates, dropping relations none of them fits instead of minting new ones. Knowledge cards show a trailing cell beside the title.
