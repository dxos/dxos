//
// Copyright 2026 DXOS.org
//

import * as AtomRegistry from 'effect/unstable/reactivity/AtomRegistry';
import { describe, test } from 'vitest';

import * as Obj from '../../Obj';
import { TestSchema } from '../../testing';

const makePerson = (name: string) => Obj.make(TestSchema.Person, { name });

/** Node removal is dispatched through the registry's async scheduler, so a sweep needs a real turn. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('entity atom memoization', () => {
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

  test('property atoms are per object and per key', ({ expect }) => {
    const person = makePerson('Alice');
    expect(Obj.atomProperty(person, 'name')).toBe(Obj.atomProperty(person, 'name'));
    expect(Obj.atomProperty(person, 'name')).not.toBe(Obj.atomProperty(person, 'address'));
    expect(Obj.atomProperty(person, 'name')).not.toBe(Obj.atomProperty(makePerson('Alice'), 'name'));
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
    Obj.update(person, (person) => {
      person.name = 'Bob';
    });
    await settle();
    expect(notified).toBeGreaterThan(0);
    expect(registry.get(atom).name).toBe('Bob');
    unsubscribe();
  });
});

/**
 * The point of keying by the entity rather than through `Atom.family`: an entity the database
 * releases takes its atoms with it, so atom lifetime follows object residency instead of layering
 * a second cache policy underneath it.
 */
describe.skipIf(!globalThis.gc)('entity atoms are released with the entity', () => {
  test('a collected entity collects its atom', async ({ expect }) => {
    let collected = false;
    const finalization = new FinalizationRegistry(() => {
      collected = true;
    });

    // Scoped so the only strong reference to the entity and its atom drops at block exit.
    (() => {
      const person = makePerson('Alice');
      finalization.register(Obj.atom(person), 'atom');
    })();

    globalThis.gc!();
    // FinalizationRegistry callbacks are queued on a later turn than the collection itself.
    await new Promise((resolve) => setTimeout(resolve, 0));
    globalThis.gc!();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(collected).toBe(true);
  });
});
