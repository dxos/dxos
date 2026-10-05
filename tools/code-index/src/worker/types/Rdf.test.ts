//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import * as Ontology from '../../Ontology.ts';
import * as TypeRdf from './Rdf.ts';
import * as Term from './Term.ts';

describe('type RDF', () => {
  test('a property states optional and readonly only when true', () => {
    const types = TypeRdf.collector();
    types.add(
      Term.object([
        { name: 'plain', type: Term.string, optional: false, readonly: false },
        { name: 'flagged', type: Term.number, optional: true, readonly: true },
      ]),
    );
    const flags = (name: string) =>
      TypeRdf.toQuads(types.nodes())
        .filter((quad) => quad.subject.value.endsWith(`/${name}`))
        .filter(
          (quad) =>
            quad.predicate.value === Ontology.optional.value || quad.predicate.value === Ontology.readonly.value,
        )
        .map((quad) => `${quad.predicate.value.split('#')[1]} ${quad.object.value}`)
        .sort();
    expect(flags('plain')).toEqual([]);
    expect(flags('flagged')).toEqual(['optional true', 'readonly true']);
  });
});
