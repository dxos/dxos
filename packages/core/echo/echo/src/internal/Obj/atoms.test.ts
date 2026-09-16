//
// Copyright 2026 DXOS.org
//

import * as AtomRegistry from 'effect/unstable/reactivity/AtomRegistry';
import { describe, test } from 'vitest';

import * as Obj from '../../Obj.ts';
import * as Ref from '../../Ref.ts';
import { TestSchema } from '../../testing/index.ts';
import { getProxyTarget } from '../common/proxy/proxy-utils.ts';
import { EventId } from '../common/proxy/symbols.ts';
import { RefTypeId } from '../Ref/ref.ts';

/** The registry removes nodes on `setImmediate`. */
const settle = () => new Promise((resolve) => setImmediate(resolve));

const listenerCount = (obj: Obj.Unknown): number => (getProxyTarget(obj) as any)[EventId].listenerCount();

/** A ref whose target arrives only when the test resolves its load. */
const makePendingRef = <T extends Obj.Unknown>() => {
  let resolve!: (target: T) => void;
  const load = new Promise<T>((resolveLoad) => {
    resolve = resolveLoad;
  });
  const ref = {
    [RefTypeId]: RefTypeId,
    target: undefined,
    onResolved: () => () => {},
    load: () => load,
  } as unknown as Ref.Ref<T>;
  return { ref, resolve };
};

describe('ref atoms', () => {
  test('a ref atom removed before its target loads leaves no subscription', async ({ expect }) => {
    const registry = AtomRegistry.make();
    const person = Obj.make(TestSchema.Person, { name: 'Alice' });
    const baseline = listenerCount(person);
    const { ref, resolve } = makePendingRef<TestSchema.Person>();

    registry.subscribe(Obj.atom(ref), () => {}, { immediate: true })();
    await settle();
    expect(registry.getNodes().size).toBe(0);

    resolve(person);
    await settle();
    expect(listenerCount(person)).toBe(baseline);
  });

  test('a ref property atom is one atom per ref and key', ({ expect }) => {
    const person = Obj.make(TestSchema.Person, { name: 'Alice' });
    const ref = Ref.make(person);
    expect(Obj.atomProperty(ref, 'name')).toBe(Obj.atomProperty(Ref.make(person), 'name'));
    expect(Obj.atomProperty(ref, 'name')).not.toBe(Obj.atomProperty(ref, 'email'));
  });
});
