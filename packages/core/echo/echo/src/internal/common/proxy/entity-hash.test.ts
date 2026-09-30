//
// Copyright 2026 DXOS.org
//

import * as Equal from 'effect/Equal';
import * as Hash from 'effect/Hash';
import * as Schema from 'effect/Schema';
import * as Atom from 'effect/unstable/reactivity/Atom';
import { describe, test } from 'vitest';

import { DXN } from '@dxos/keys';

import * as Obj from '../../../Obj.ts';
import * as Relation from '../../../Relation.ts';
import { TestSchema } from '../../../testing/index.ts';
import { EchoObjectSchema } from '../../Entity/index.ts';

/** Nested record carrying an application-level `id`, which must not read as an entity id. */
const Container = Schema.Struct({
  item: Schema.Struct({ id: Schema.String, label: Schema.String }),
}).pipe(EchoObjectSchema(DXN.make('com.example.type.container', '0.1.0')));

describe('entity Hash/Equal traits', () => {
  test('objects implement both traits', ({ expect }) => {
    const person = Obj.make(TestSchema.Person, { name: 'Alice' });
    expect(Hash.isHash(person)).to.be.true;
    expect(Equal.isEqual(person)).to.be.true;
  });

  test('hash is derived from the id, not the contents', ({ expect }) => {
    const person = Obj.make(TestSchema.Person, { name: 'Alice' });
    // A detached (non-database) object must hash without touching the database or the URI codec.
    expect(() => Hash.hash(person)).to.not.throw();
    expect(Hash.hash(person)).to.eq(Hash.hash(person.id));
  });

  test('hash is stable across mutation', ({ expect }) => {
    const person = Obj.make(TestSchema.Person, { name: 'Alice' });
    const before = Hash.hash(person);
    Obj.update(person, (person) => {
      person.name = 'Bob';
    });
    expect(Hash.hash(person)).to.eq(before);
  });

  test('an object equals itself', ({ expect }) => {
    const person = Obj.make(TestSchema.Person, { name: 'Alice' });
    expect(Equal.equals(person, person)).to.be.true;
  });

  test('a duplicate proxy (invariant violation) still resolves to one entity', ({ expect }) => {
    const person = Obj.make(TestSchema.Person, { name: 'Alice' });
    const duplicate = duplicateProxy(person);
    expect(duplicate).to.not.eq(person);

    expect(Equal.equals(person, duplicate)).to.be.true;
    expect(Hash.hash(duplicate)).to.eq(Hash.hash(person));
  });

  test('distinct ids, identical contents — not equal', ({ expect }) => {
    const first = Obj.make(TestSchema.Person, { name: 'Alice' });
    const second = Obj.make(TestSchema.Person, { name: 'Alice' });
    expect(Equal.equals(first, second)).to.be.false;
    expect(Equal.equals(second, first)).to.be.false;
  });

  test('an entity never equals a non-entity', ({ expect }) => {
    const person = Obj.make(TestSchema.Person, { name: 'Alice' });
    expect(Equal.equals(person, { id: person.id, name: 'Alice' })).to.be.false;
  });

  test('relations implement both traits', ({ expect }) => {
    const employment = makeEmployment('CEO');
    expect(Hash.isHash(employment)).to.be.true;
    expect(Equal.isEqual(employment)).to.be.true;
    expect(Hash.hash(employment)).to.eq(Hash.hash(employment.id));

    expect(Equal.equals(employment, employment)).to.be.true;
    expect(Equal.equals(employment, makeEmployment('CEO'))).to.be.false;
  });

  test('nested records fall back to reference identity', ({ expect }) => {
    const person = Obj.make(TestSchema.Person, { name: 'Alice', address: { city: 'Lisbon', coordinates: {} } });
    // Nested records carry no id; two reads resolve to the same cached proxy.
    expect(Equal.equals(person.address, person.address)).to.be.true;
    expect(Hash.hash(person.address)).to.eq(Hash.hash(person.address));

    const other = Obj.make(TestSchema.Person, { name: 'Bob', address: { city: 'Lisbon', coordinates: {} } });
    expect(Equal.equals(person.address, other.address)).to.be.false;
  });

  test('an application-level id on a nested record is not an entity id', ({ expect }) => {
    const person = Obj.make(TestSchema.Person, { name: 'Alice' });
    const container = Obj.make(Container, { item: { id: person.id, label: 'a' } });

    // Both directions: Effect caches an equality verdict for the pair, so one `true` would settle
    // the reverse lookup too.
    expect(Equal.equals(container.item, person)).to.be.false;
    expect(Equal.equals(person, container.item)).to.be.false;

    const other = Obj.make(Container, { item: { id: person.id, label: 'b' } });
    expect(Equal.equals(container.item, other.item)).to.be.false;
  });

  test('Atom.family keys by entity, not by contents', ({ expect }) => {
    const person = Obj.make(TestSchema.Person, { name: 'Alice' });
    expect(Obj.atom(person)).to.eq(Obj.atom(person));

    expect(Obj.atom(Obj.make(TestSchema.Person, { name: 'Alice' }))).to.not.eq(
      Obj.atom(Obj.make(TestSchema.Person, { name: 'Alice' })),
    );

    // An atom is looked up throughout an object's life, so mutation must not re-key it mid-flight.
    Obj.update(person, (person) => {
      person.name = 'Bob';
    });
    expect(Obj.atom(person)).to.eq(Obj.atom(person));
  });

  test('a family keyed directly by an entity round-trips', ({ expect }) => {
    const family = Atom.family((obj: Obj.Unknown) => Atom.make(() => obj.id));
    const person = Obj.make(TestSchema.Person, { name: 'Alice' });
    expect(family(person)).to.eq(family(person));
    expect(family(person)).to.not.eq(family(Obj.make(TestSchema.Person, { name: 'Alice' })));

    // Two atoms racing over one entity is the failure a duplicate proxy would otherwise cause.
    expect(family(person)).to.eq(family(duplicateProxy(person)));
  });
});

const makeEmployment = (role: string) =>
  Relation.make(TestSchema.EmployedBy, {
    [Relation.Source]: Obj.make(TestSchema.Person, { name: 'Alice' }),
    [Relation.Target]: Obj.make(TestSchema.Organization, { name: 'DXOS' }),
    role,
  });

/**
 * Fabricate the state ECHO forbids — a second live proxy over an entity that already has one
 * (`createProxy` caches by target; the database asserts a single `core.rootProxy`).
 */
const duplicateProxy = (person: TestSchema.Person): TestSchema.Person => {
  const copy = Obj.clone(person, { retainId: true });
  Obj.update(copy, (copy) => {
    copy.name = 'diverged';
  });
  return copy;
};
