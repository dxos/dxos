//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as AtomRegistry from 'effect/unstable/reactivity/AtomRegistry';
import { describe, test } from 'vitest';

import * as Annotation from '../../Annotation.ts';
import * as Entity from '../../Entity.ts';
import * as Obj from '../../Obj.ts';
import { TestSchema } from '../../testing/index.ts';

const makePerson = (name: string) => Obj.make(TestSchema.Person, { name });

const ColorAnnotation = Annotation.make({ id: 'org.dxos.test.entity-atoms.color', schema: Schema.String });
const OrderAnnotation = Annotation.make({
  id: 'org.dxos.test.entity-atoms.order',
  schema: Schema.Record(Schema.String, Schema.Array(Schema.String)),
});

/** The registry removes nodes on `setImmediate`, which a zero-delay timer can run ahead of. */
const settle = () => new Promise((resolve) => setImmediate(resolve));

describe('entity atoms', () => {
  test('every accessor for the same view of an entity returns the same atom', ({ expect }) => {
    const person = makePerson('Alice');
    expect(Obj.atom(person)).toBe(Entity.atom(person));
    expect(Obj.labelAtom(person)).toBe(Entity.labelAtom(person));
  });

  test('one atom per entity, stable across mutation', ({ expect }) => {
    const person = makePerson('Alice');
    expect(Obj.atom(person)).toBe(Obj.atom(person));

    Obj.update(person, (person) => {
      person.name = 'Bob';
    });
    expect(Obj.atom(person)).toBe(Obj.atom(person));
  });

  test('distinct entities get distinct atoms', ({ expect }) => {
    expect(Obj.atom(makePerson('Alice'))).not.toBe(Obj.atom(makePerson('Alice')));
  });

  test('two live objects sharing an id get their own atoms', ({ expect }) => {
    // Each object carries its own subscription, so neither is handed an atom watching an object it does not hold.
    const person = makePerson('Alice');
    const sameId = Obj.clone(person, { retainId: true });
    expect(sameId.id).toBe(person.id);
    expect(Obj.atom(person)).not.toBe(Obj.atom(sameId));
  });

  test('a mutable view shares its object atom', ({ expect }) => {
    const person = makePerson('Alice');
    const atom = Obj.atom(person);
    const nameAtom = Obj.atomProperty(person, 'name');
    Obj.update(person, (person) => {
      expect(Obj.atom(person)).toBe(atom);
      expect(Obj.atomProperty(person, 'name')).toBe(nameAtom);
    });
  });

  test('property atoms are per object and per key', ({ expect }) => {
    const person = makePerson('Alice');
    expect(Obj.atomProperty(person, 'name')).toBe(Obj.atomProperty(person, 'name'));
    expect(Obj.atomProperty(person, 'name')).not.toBe(Obj.atomProperty(person, 'address'));
    expect(Obj.atomProperty(person, 'name')).not.toBe(Obj.atomProperty(makePerson('Alice'), 'name'));
  });

  test('annotation atoms are per object, per annotation and per key', ({ expect }) => {
    const person = makePerson('Alice');
    expect(Annotation.atom(person, ColorAnnotation)).toBe(Annotation.atom(person, ColorAnnotation));
    expect(Annotation.atom(person, ColorAnnotation)).not.toBe(Annotation.atom(person, OrderAnnotation));
    expect(Annotation.atom(person, ColorAnnotation)).not.toBe(Annotation.atom(makePerson('Alice'), ColorAnnotation));
    expect(Annotation.atomProperty(person, OrderAnnotation, 'a')).toBe(
      Annotation.atomProperty(person, OrderAnnotation, 'a'),
    );
    expect(Annotation.atomProperty(person, OrderAnnotation, 'a')).not.toBe(
      Annotation.atomProperty(person, OrderAnnotation, 'b'),
    );
  });

  test('a non-proxy entity keeps its atoms on itself', ({ expect }) => {
    const entity = { [Entity.KindId]: Entity.Kind.Object, id: 'plain' } as unknown as Entity.Unknown;
    expect(Entity.atom(entity)).toBe(Entity.atom(entity));
    expect(Entity.atom(entity)).not.toBe(Entity.atom({ ...entity } as Entity.Unknown));
  });

  test('the live atom notifies on every change', ({ expect }) => {
    const registry = AtomRegistry.make();
    const person = makePerson('Alice');
    let notified = 0;
    const unsubscribe = registry.subscribe(
      Obj.atomReactive(person),
      () => {
        notified++;
      },
      { immediate: true },
    );
    const before = notified;
    Obj.update(person, (person) => {
      person.name = 'Bob';
    });
    expect(notified).toBe(before + 1);
    expect(registry.get(Obj.atomReactive(person))).toBe(person);
    unsubscribe();
  });

  test('an unobserved entity atom is released by the registry', async ({ expect }) => {
    // The atom is memoized for the entity's lifetime, but its registry node — the cached snapshot
    // and the live subscription — is bounded by observation. `keepAlive` would pin both forever.
    const registry = AtomRegistry.make();
    const person = makePerson('Alice');
    const atom = Obj.atom(person);

    const unsubscribe = registry.subscribe(atom, () => {});
    expect(registry.getNodes().size).toBe(1);

    unsubscribe();
    await settle();
    expect(registry.getNodes().size).toBe(0);

    // Re-reading rebuilds cleanly from the entity, which is the source of truth.
    expect(registry.get(atom).name).toBe('Alice');
  });

  test('a rebuilt atom re-subscribes to its entity', async ({ expect }) => {
    const registry = AtomRegistry.make();
    const person = makePerson('Alice');
    const atom = Obj.atom(person);

    // Read as a live consumer does: the node is built lazily, and building it is what wires the
    // atom's subscription to the entity.
    registry.subscribe(atom, () => {}, { immediate: true })();
    await settle();
    expect(registry.getNodes().size).toBe(0);

    let notified = 0;
    const unsubscribe = registry.subscribe(
      atom,
      () => {
        notified++;
      },
      { immediate: true },
    );
    const before = notified;
    Obj.update(person, (person) => {
      person.name = 'Bob';
    });
    await settle();
    expect(notified).toBeGreaterThan(before);
    expect(registry.get(atom).name).toBe('Bob');
    unsubscribe();
  });
});

/**
 * The regression `Atom.keepAlive` caused: a registry node pinned its atom, and the atom's closure pinned
 * the entity, so nothing an app ever rendered was collected.
 */
describe('entity atoms are released with the entity', { tags: ['memory'] }, () => {
  test('an entity read through a registry is collectable once unobserved', async ({ expect }) => {
    const registry = AtomRegistry.make();
    let collected = false;
    const finalization = new FinalizationRegistry(() => {
      collected = true;
    });

    // Scoped so the only strong references left are the registry's.
    (() => {
      const person = makePerson('Alice');
      finalization.register(person, 'entity');
      registry.subscribe(Obj.atom(person), () => {}, { immediate: true })();
    })();
    await settle();
    expect(registry.getNodes().size).toBe(0);

    globalThis.gc!();
    // FinalizationRegistry callbacks are queued on a later turn than the collection itself.
    await new Promise((resolve) => setTimeout(resolve, 0));
    globalThis.gc!();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(collected).toBe(true);
  });
});
