//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type SemanticQuery, buildSparql } from './query-builder.ts';
import { parseSparqlToQuery } from './sparql-to-query.ts';

describe('parseSparqlToQuery', () => {
  test('round-trips buildSparql for each query field', ({ expect }) => {
    const cases: SemanticQuery[] = [
      { subjectEntity: 'alice' },
      { predicate: 'https://dxos.org/ontology/travelTo' },
      { source: 'dxn:queue:space:m1' },
      { entity: 'alice' },
      { minConfidence: 0.5 },
      { subjectEntity: 'alice', predicate: 'https://dxos.org/ontology/travelTo' },
      { entity: 'did:key:z6Mk' },
    ];
    for (const query of cases) {
      expect(parseSparqlToQuery(buildSparql(query))).toEqual(query);
    }
  });

  test('parses a hand-written SELECT', ({ expect }) => {
    const query = parseSparqlToQuery(`
      PREFIX dx: <https://dxos.org/ontology/>
      SELECT ?g WHERE {
        GRAPH ?g { <https://dxos.org/semantic/entity/sarah-johnson> dx:leads ?team }
      }
    `);
    expect(query).toEqual({ subjectEntity: 'sarah-johnson', predicate: 'https://dxos.org/ontology/leads' });
  });

  test('parses source + minConfidence filter', ({ expect }) => {
    const query = parseSparqlToQuery(`
      PREFIX sx:   <https://dxos.org/semantic#>
      PREFIX prov: <http://www.w3.org/ns/prov#>
      PREFIX xsd:  <http://www.w3.org/2001/XMLSchema#>
      SELECT ?g WHERE {
        ?g prov:wasDerivedFrom "dxn:queue:space:m1" .
        ?g sx:confidence ?conf .
        FILTER(xsd:decimal(?conf) >= 0.7)
      }
    `);
    expect(query).toEqual({ source: 'dxn:queue:space:m1', minConfidence: 0.7 });
  });

  test('throws on unparseable input', ({ expect }) => {
    expect(() => parseSparqlToQuery('NOT SPARQL AT ALL')).toThrow();
  });
});
