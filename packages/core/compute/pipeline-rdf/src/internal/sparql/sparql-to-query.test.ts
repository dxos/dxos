//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { type SemanticQuery, buildSparql } from './query-builder';
import { parseSparqlToQuery } from './sparql-to-query';

describe('parseSparqlToQuery', () => {
  test('round-trips buildSparql for each query field', ({ expect }) => {
    const cases: SemanticQuery[] = [
      { subjectEntity: 'alice' },
      { predicate: 'travelsTo' },
      { source: 'dxn:queue:space:m1' },
      { entity: 'alice' },
      { minConfidence: 0.5 },
      { subjectEntity: 'alice', predicate: 'travelsTo' },
    ];
    for (const query of cases) {
      expect(parseSparqlToQuery(buildSparql(query))).toEqual(query);
    }
  });

  test('parses a hand-written SELECT', ({ expect }) => {
    const query = parseSparqlToQuery(`
      PREFIX sx: <https://dxos.org/semantic#>
      SELECT ?fact ?p ?o WHERE {
        ?fact sx:subject <https://dxos.org/semantic/entity/sarah-johnson> .
        ?fact sx:predicate "leads" .
        ?fact ?p ?o .
      }
    `);
    expect(query).toEqual({ subjectEntity: 'sarah-johnson', predicate: 'leads' });
  });

  test('parses source + minConfidence filter', ({ expect }) => {
    const query = parseSparqlToQuery(`
      PREFIX sx:   <https://dxos.org/semantic#>
      PREFIX prov: <http://www.w3.org/ns/prov#>
      PREFIX xsd:  <http://www.w3.org/2001/XMLSchema#>
      SELECT ?fact WHERE {
        ?fact prov:wasDerivedFrom "dxn:queue:space:m1" .
        ?fact sx:confidence ?conf .
        FILTER(xsd:decimal(?conf) >= 0.7)
      }
    `);
    expect(query).toEqual({ source: 'dxn:queue:space:m1', minConfidence: 0.7 });
  });

  test('throws on unparseable input', ({ expect }) => {
    expect(() => parseSparqlToQuery('NOT SPARQL AT ALL')).toThrow();
  });
});
