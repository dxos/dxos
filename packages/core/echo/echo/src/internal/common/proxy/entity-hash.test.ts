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
 * Fabricate the state ECHO forbids: a second live proxy over an entity that already has one, with
 * contents since diverged from the original.
 *
 * One entity has exactly one live proxy — `createProxy` caches by target, `EchoDatabase.getObjectById`
 * hands back `core.rootProxy`, and `initEchoReactiveObjectRootProxy` asserts `!core.rootProxy`. A
 * duplicate is a bug, not a supported way to hold two views; `clone(…, { retainId: true })` produces
 * one only because the copy is meant to be handed to a *different* database, not kept alongside the
 * original. The tests below pin what the traits do if that invariant is broken anyway — the pair
 * agrees on entity identity instead of silently keying off whichever copy's contents were read first.
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

    // Structurally identical but distinct entities must not collapse into one atom.
    expect(Obj.atom(makePerson('Alice'))).to.not.eq(Obj.atom(makePerson('Alice')));

    // Mutation must not re-key an entity mid-flight: an atom is looked up many times over an
    // object's life, and a contents-derived key would hand out a fresh atom after every update.
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

    // A duplicate proxy is an invariant violation (see `duplicateProxy`); should one appear, both
    // resolve to the same family entry rather than to two atoms racing over one entity.
    expect(family(person)).to.eq(family(duplicateProxy(person)));
  });
});
