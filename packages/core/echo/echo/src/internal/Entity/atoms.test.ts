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
  test('an entity has one atom per kind, shared by its accessors and views', ({ expect }) => {
    const person = makePerson('Alice');
    const atom = Obj.atom(person);
    const nameAtom = Obj.atomProperty(person, 'name');
    expect(Entity.atom(person)).toBe(atom);
    expect(Obj.labelAtom(person)).toBe(Entity.labelAtom(person));

    Obj.update(person, (person) => {
      person.name = 'Bob';
      expect(Obj.atom(person)).toBe(atom);
      expect(Obj.atomProperty(person, 'name')).toBe(nameAtom);
    });
    expect(Obj.atom(person)).toBe(atom);
  });

  test('entities get their own atoms, even when they share an id', ({ expect }) => {
    const person = makePerson('Alice');
    expect(Obj.atom(makePerson('Alice'))).not.toBe(Obj.atom(person));
    expect(Obj.atom(Obj.clone(person, { retainId: true }))).not.toBe(Obj.atom(person));
  });

  test('property and annotation atoms are keyed by key and annotation', ({ expect }) => {
    const person = makePerson('Alice');
    expect(Obj.atomProperty(person, 'name')).not.toBe(Obj.atomProperty(person, 'email'));
    expect(Annotation.atom(person, ColorAnnotation)).toBe(Annotation.atom(person, ColorAnnotation));
    expect(Annotation.atom(person, ColorAnnotation)).not.toBe(Annotation.atom(person, OrderAnnotation));
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
  });

  test('the live atom notifies on change', ({ expect }) => {
    const registry = AtomRegistry.make();
    const person = makePerson('Alice');
    let notified = 0;
    const unsubscribe = registry.subscribe(Obj.atomReactive(person), () => notified++, { immediate: true });
    notified = 0;
    Obj.update(person, (person) => {
      person.name = 'Bob';
    });
    expect(notified).toBe(1);
    unsubscribe();
  });

  test('an unobserved atom is released and subscribes again when rebuilt', async ({ expect }) => {
    const registry = AtomRegistry.make();
    const person = makePerson('Alice');
    const atom = Obj.atom(person);

    registry.subscribe(atom, () => {}, { immediate: true })();
    await settle();
    expect(registry.getNodes().size).toBe(0);

    const unsubscribe = registry.subscribe(atom, () => {}, { immediate: true });
    Obj.update(person, (person) => {
      person.name = 'Bob';
    });
    expect(registry.get(atom).name).toBe('Bob');
    unsubscribe();
  });
});

describe('entity atoms are released with the entity', { tags: ['memory'] }, () => {
  test('an entity read through a registry is collectable once unobserved', async ({ expect }) => {
    const registry = AtomRegistry.make();
    let collected = false;
    const finalization = new FinalizationRegistry(() => {
      collected = true;
    });

    (() => {
      const person = makePerson('Alice');
      finalization.register(person, 'entity');
      registry.subscribe(Obj.atom(person), () => {}, { immediate: true })();
    })();
    await settle();
    expect(registry.getNodes().size).toBe(0);

    globalThis.gc!();
    // FinalizationRegistry callbacks are queued on a later turn than the collection itself.
    await settle();

    expect(collected).toBe(true);
  });
});
