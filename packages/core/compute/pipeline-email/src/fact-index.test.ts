//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Obj } from '@dxos/echo';
import { Type, normalizeEntityId } from '@dxos/semantic-index';
import { Organization, Person } from '@dxos/types';

import { buildEntityIndex, reconcileFactEntities } from './fact-index';

const fact = (subjectLabel: string, objectLabel: string): Type.Fact => ({
  id: 'f1',
  assertion: {
    subject: { entity: normalizeEntityId(subjectLabel), label: subjectLabel },
    predicate: 'works at',
    object: { entity: normalizeEntityId(objectLabel), label: objectLabel },
  },
  valence: { factuality: 'CT+', polarity: '+' },
  attribution: { source: 'dxn:queue:m1', generatedAtTime: '2001-05-14T10:00:00.000Z' },
  recordedAt: '2001-05-14T10:00:00.000Z',
  extractor: { id: 'default', model: 'test', version: '1' },
  sourceHash: 'h1',
});

describe('entity reconciliation', () => {
  test('buildEntityIndex maps normalized names/emails to object DXNs', ({ expect }) => {
    const alice = Obj.make(Person.Person, { fullName: 'Alice Smith', emails: [{ value: 'alice@enron.com' }] });
    const enron = Obj.make(Organization.Organization, { name: 'Enron' });

    const index = buildEntityIndex([alice, enron]);
    expect(index.get(normalizeEntityId('Alice Smith'))).toBe(Obj.getURI(alice));
    expect(index.get(normalizeEntityId('alice@enron.com'))).toBe(Obj.getURI(alice));
    expect(index.get(normalizeEntityId('Enron'))).toBe(Obj.getURI(enron));
  });

  test('reconcileFactEntities resolves subject/object to DXNs when known', ({ expect }) => {
    const alice = Obj.make(Person.Person, { fullName: 'Alice Smith', emails: [{ value: 'alice@enron.com' }] });
    const enron = Obj.make(Organization.Organization, { name: 'Enron' });
    const index = buildEntityIndex([alice, enron]);

    const resolved = reconcileFactEntities(fact('Alice Smith', 'Enron'), index);
    expect(resolved.subject).toBe(Obj.getURI(alice));
    expect(resolved.object).toBe(Obj.getURI(enron));
  });

  test('reconcileFactEntities leaves unknown entities unresolved', ({ expect }) => {
    const index = buildEntityIndex([]);
    const resolved = reconcileFactEntities(fact('Nobody', 'Nowhere'), index);
    expect(resolved.subject).toBeUndefined();
    expect(resolved.object).toBeUndefined();
  });
});
