//
// Copyright 2026 DXOS.org
//

import { defineConfig } from '../../../../vite.base.config.ts';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    Fact: 'src/Fact.ts',
    FactFeed: 'src/FactFeed.ts',
    Graph: 'src/Graph.ts',
    Hash: 'src/Hash.ts',
    Mapping: 'src/Mapping.ts',
    MemoryError: 'src/MemoryError.ts',
    MemoryQuery: 'src/MemoryQuery.ts',
    MemoryService: 'src/MemoryService.ts',
    Ontology: 'src/Ontology.ts',
    Pipeline: 'src/Pipeline.ts',
    Predicate: 'src/Predicate.ts',
    Rdf: 'src/Rdf.ts',
    RdfStore: 'src/RdfStore.ts',
    Sparql: 'src/Sparql.ts',
    Subscription: 'src/Subscription.ts',
    Trig: 'src/Trig.ts',
    Vocab: 'src/Vocab.ts',
    Vocabularies: 'src/Vocabularies.ts',
  },
  test: { node: true },
});
