//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import * as Obj from '../../../Obj';
import { TestSchema } from '../../../testing';

describe('Obj.subscribe', () => {
  test('subscribes and fires for reactive proxies', () => {
    const obj = Obj.make(TestSchema.Person, { name: 'Test' });
    let calls = 0;
    const unsubscribe = Obj.subscribe(obj, () => {
      calls++;
    });

    Obj.change(obj, (obj) => {
      obj.name = 'Updated';
    });
    expect(calls).toBeGreaterThan(0);

    unsubscribe();
    const seen = calls;
    Obj.change(obj, (obj) => {
      obj.name = 'After unsubscribe';
    });
    expect(calls).toBe(seen);
  });

  // Regression: queue-stored typed objects (e.g. ContextBinding) and other Obj-shaped values
  // satisfy `Obj.isObject` (KindId is set) but are not wrapped in a reactive Proxy. Earlier
  // versions invariant'd inside `getProxyTarget` when an atom body did `Obj.subscribe(obj)` on
  // such an input. The contract is "no-op for non-reactive inputs"; verify the function
  // returns gracefully instead of throwing.
  test('returns a no-op unsubscribe for non-proxy inputs', () => {
    const queueShaped: any = {
      id: '01KQ5NKXJWSKMRPVTVG2GHV8V3',
      blueprints: { added: [], removed: [] },
      objects: { added: [], removed: [] },
    };
    const unsubscribe = Obj.subscribe(queueShaped, () => {});
    expect(typeof unsubscribe).toBe('function');
    expect(() => unsubscribe()).not.toThrow();
  });

  test('returns a no-op unsubscribe for primitives, null, and undefined', () => {
    for (const value of [null, undefined, 42, 'string', true]) {
      const unsubscribe = Obj.subscribe(value as any, () => {});
      expect(typeof unsubscribe).toBe('function');
      expect(() => unsubscribe()).not.toThrow();
    }
  });
});
