//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { formatBindings } from './bindings.ts';

describe('formatBindings', () => {
  test('shortens IRIs by prefix and by graph, and marks unbound variables', () => {
    const graph = 'https://dxos.org/semantic/graph/abc';
    const text = formatBindings(
      [
        {
          person: { termType: 'NamedNode', value: `${graph}#alice` },
          label: { termType: 'Literal', value: 'Alice "A" Chen' },
          kind: { termType: 'NamedNode', value: 'https://schema.org/Person' },
        },
        {
          person: { termType: 'NamedNode', value: 'https://example.com/people/bob smith' },
          kind: { termType: 'NamedNode', value: 'https://dxos.org/semantic/brain/local/mentor' },
          count: { termType: 'Literal', value: '3', datatype: 'http://www.w3.org/2001/XMLSchema#integer' },
        },
      ],
      { variables: ['person', 'label', 'kind', 'count'], namespace: 'https://dxos.org/semantic/brain/local/' },
    );
    expect(text).toBe(
      [
        `PREFIX g1: <${graph}#>`,
        'PREFIX schema: <https://schema.org/>',
        'PREFIX brain: <https://dxos.org/semantic/brain/local/>',
        'PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>',
        '',
        'VALUES (?person ?label ?kind ?count) {',
        '  (g1:alice "Alice \\"A\\" Chen" schema:Person UNDEF)',
        '  (<https://example.com/people/bob smith> UNDEF brain:mentor "3"^^xsd:integer)',
        '}',
      ].join('\n'),
    );
  });

  test('takes its columns from the rows when none are given', () => {
    expect(formatBindings([{ n: { termType: 'Literal', value: '2' } }])).toBe('VALUES (?n) {\n  ("2")\n}');
  });
});
