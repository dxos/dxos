//
// Copyright 2026 DXOS.org
//

import * as Equal from 'effect/Equal';
import * as Hash from 'effect/Hash';
import * as Atom from 'effect/unstable/reactivity/Atom';
import { describe, expect, test } from 'vitest';

import * as Obj from '../../../Obj';
import * as Relation from '../../../Relation';
import { TestSchema } from '../../../testing';

const makePerson = (name: string) => Obj.make(TestSchema.Person, { name });

/**
 * Fabricate the state ECHO forbids — a second live proxy over an entity that already has one
 * (`createProxy` caches by target; the database asserts a single `core.rootProxy`) — so the cases
 * below can pin what the traits do should that invariant ever be broken.
 */
const duplicateProxy = (person: TestSchema.Person): TestSchema.Person => {
  const copy = Obj.clone(person, { retainId: true });
  Obj.update(copy, (copy) => {
    copy.name = 'diverged';
  });
  return copy;
};

const makeEmployment = (role: string) =>
  Relation.make(TestSchema.EmployedBy, {
    [Relation.Source]: makePerson('Alice'),
    [Relation.Target]: Obj.make(TestSchema.Organization, { name: 'DXOS' }),
    role,
  });

describe('entity Hash/Equal traits', () => {
  test('objects implement both traits', () => {
    const person = makePerson('Alice');
    expect(Hash.isHash(person)).to.be.true;
    expect(Equal.isEqual(person)).to.be.true;
  });

  test('hash is derived from the id, not the contents', () => {
    const person = makePerson('Alice');
    // A detached (non-database) object must hash without touching the database or the URI codec.
    expect(() => Hash.hash(person)).to.not.throw();
    expect(Hash.hash(person)).to.eq(Hash.hash(person.id));
  });

  test('hash is stable across mutation', () => {
    const person = makePerson('Alice');
    const before = Hash.hash(person);
    Obj.update(person, (person) => {
      person.name = 'Bob';
    });
    expect(Hash.hash(person)).to.eq(before);
  });

  test('an object equals itself', () => {
    const person = makePerson('Alice');
    expect(Equal.equals(person, person)).to.be.true;
  });

  test('a duplicate proxy (invariant violation) still resolves to one entity', () => {
    const person = makePerson('Alice');
    const duplicate = duplicateProxy(person);
    expect(duplicate).to.not.eq(person);

    expect(Equal.equals(person, duplicate)).to.be.true;
    expect(Hash.hash(duplicate)).to.eq(Hash.hash(person));
  });

  test('distinct ids, identical contents — not equal', () => {
    expect(Equal.equals(makePerson('Alice'), makePerson('Alice'))).to.be.false;
  });

  test('an entity never equals a non-entity', () => {
    const person = makePerson('Alice');
    expect(Equal.equals(person, { id: person.id, name: 'Alice' })).to.be.false;
  });

  test('relations implement both traits', () => {
    const employment = makeEmployment('CEO');
    expect(Hash.isHash(employment)).to.be.true;
    expect(Equal.isEqual(employment)).to.be.true;
    expect(Hash.hash(employment)).to.eq(Hash.hash(employment.id));

    expect(Equal.equals(employment, employment)).to.be.true;
    expect(Equal.equals(employment, makeEmployment('CEO'))).to.be.false;
  });

  test('nested records fall back to reference identity', () => {
    const person = Obj.make(TestSchema.Person, { name: 'Alice', address: { city: 'Lisbon', coordinates: {} } });
    // Nested records carry no id; two reads resolve to the same cached proxy.
    expect(Equal.equals(person.address, person.address)).to.be.true;
    expect(Hash.hash(person.address)).to.eq(Hash.hash(person.address));

    const other = Obj.make(TestSchema.Person, { name: 'Bob', address: { city: 'Lisbon', coordinates: {} } });
    expect(Equal.equals(person.address, other.address)).to.be.false;
  });

  test('Atom.family keys by entity, not by contents', () => {
    const person = makePerson('Alice');
    expect(Obj.atom(person)).to.eq(Obj.atom(person));

    expect(Obj.atom(makePerson('Alice'))).to.not.eq(Obj.atom(makePerson('Alice')));

    // An atom is looked up throughout an object's life, so mutation must not re-key it mid-flight.
    Obj.update(person, (person) => {
      person.name = 'Bob';
    });
    expect(Obj.atom(person)).to.eq(Obj.atom(person));
  });

  test('a family keyed directly by an entity round-trips', () => {
    const family = Atom.family((obj: Obj.Unknown) => Atom.make(() => obj.id));
    const person = makePerson('Alice');
    expect(family(person)).to.eq(family(person));
    expect(family(person)).to.not.eq(family(makePerson('Alice')));

    // Two atoms racing over one entity is the failure a duplicate proxy would otherwise cause.
    expect(family(person)).to.eq(family(duplicateProxy(person)));
  });
});
