//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { Obj, Type } from '@dxos/echo';
import { registerSignalsRuntime } from '@dxos/echo-signals';

import { createObject, isEchoObject } from './echo-handler';

registerSignalsRuntime();

const Person = Schema.Struct({
  name: Schema.String,
  age: Schema.optional(Schema.Number),
  tags: Schema.optional(Schema.mutable(Schema.Array(Schema.String))),
  address: Schema.optional(
    Schema.mutable(
      Schema.Struct({
        street: Schema.String,
        city: Schema.optional(Schema.String),
      }),
    ),
  ),
}).pipe(Type.Obj({ typename: 'test.com/type/Person', version: '0.1.0' }));

const Contact = Schema.Struct({
  email: Schema.String,
}).pipe(Type.Obj({ typename: 'test.com/type/Contact', version: '0.1.0' }));

describe('Obj.change', () => {
  test('basic property mutation within Obj.change', ({ expect }) => {
    const obj = createObject(Obj.make(Person, { name: 'John' }));
    expect(obj.name).toBe('John');

    Obj.change(obj, (p) => {
      p.name = 'Jane';
    });

    expect(obj.name).toBe('Jane');
  });

  test('multiple mutations in single Obj.change', ({ expect }) => {
    const obj = createObject(Obj.make(Person, { name: 'John' }));

    Obj.change(obj, (p) => {
      p.name = 'Jane';
      p.age = 30;
    });

    expect(obj.name).toBe('Jane');
    expect(obj.age).toBe(30);
  });

  test('nested object mutation within Obj.change', ({ expect }) => {
    const obj = createObject(Obj.make(Person, { name: 'John', address: { street: '123 Main St' } }));

    Obj.change(obj, (p) => {
      p.address!.city = 'New York';
    });

    expect(obj.address?.city).toBe('New York');
    expect(obj.address?.street).toBe('123 Main St');
  });

  test('array push mutation within Obj.change', ({ expect }) => {
    const obj = createObject(Obj.make(Person, { name: 'John', tags: ['developer'] }));

    Obj.change(obj, (p) => {
      p.tags!.push('engineer');
    });

    expect(obj.tags).toEqual(['developer', 'engineer']);
  });

  test('array pop mutation within Obj.change', ({ expect }) => {
    const obj = createObject(Obj.make(Person, { name: 'John', tags: ['a', 'b', 'c'] }));

    let popped: string | undefined;
    Obj.change(obj, (p) => {
      popped = p.tags!.pop();
    });

    expect(popped).toBe('c');
    expect(obj.tags).toEqual(['a', 'b']);
  });

  test('array splice mutation within Obj.change', ({ expect }) => {
    const obj = createObject(Obj.make(Person, { name: 'John', tags: ['a', 'b', 'c'] }));

    Obj.change(obj, (p) => {
      p.tags!.splice(1, 1, 'x', 'y');
    });

    expect(obj.tags).toEqual(['a', 'x', 'y', 'c']);
  });

  test('mutation outside Obj.change throws error for property assignment', ({ expect }) => {
    const obj = createObject(Obj.make(Person, { name: 'John' }));

    expect(() => {
      obj.name = 'Jane';
    }).toThrow(/Cannot modify ECHO object property.*outside of Obj.change/);
  });

  test('mutation outside Obj.change throws error for array push', ({ expect }) => {
    const obj = createObject(Obj.make(Person, { name: 'John', tags: ['a'] }));

    expect(() => {
      obj.tags!.push('b');
    }).toThrow(/Cannot call array.push\(\) on ECHO object outside of Obj.change/);
  });

  test('mutation outside Obj.change throws error for array pop', ({ expect }) => {
    const obj = createObject(Obj.make(Person, { name: 'John', tags: ['a'] }));

    expect(() => {
      obj.tags!.pop();
    }).toThrow(/Cannot call array.pop\(\) on ECHO object outside of Obj.change/);
  });

  test('mutation outside Obj.change throws error for property delete', ({ expect }) => {
    const obj = createObject(Obj.make(Person, { name: 'John', age: 25 }));

    expect(() => {
      delete (obj as any).age;
    }).toThrow(/Cannot delete ECHO object property.*outside of Obj.change/);
  });

  test('error in callback does not leave object in broken state', ({ expect }) => {
    const obj = createObject(Obj.make(Person, { name: 'John' }));

    expect(() => {
      Obj.change(obj, (p) => {
        p.name = 'Jane';
        throw new Error('Test error');
      });
    }).toThrow('Test error');

    // Object should still be readonly after error.
    expect(() => {
      obj.name = 'Bob';
    }).toThrow(/Cannot modify ECHO object property.*outside of Obj.change/);
  });

  test('batched notifications - only one notification per Obj.change', ({ expect }) => {
    const obj = createObject(Obj.make(Person, { name: 'John' }));

    let notificationCount = 0;
    const unsubscribe = Obj.subscribe(obj, () => {
      notificationCount++;
    });

    Obj.change(obj, (p) => {
      p.name = 'Jane';
      p.age = 30;
      p.tags = ['a', 'b'];
    });

    // Should only fire one notification for all changes.
    expect(notificationCount).toBe(1);

    unsubscribe();
  });

  test('nested Obj.change calls work correctly', ({ expect }) => {
    const obj = createObject(Obj.make(Person, { name: 'John' }));

    Obj.change(obj, (p) => {
      p.name = 'Jane';

      // Nested change should work (already in change context).
      Obj.change(obj, (p2) => {
        p2.age = 30;
      });
    });

    expect(obj.name).toBe('Jane');
    expect(obj.age).toBe(30);
  });

  test('Obj.change on non-ECHO object just calls callback', ({ expect }) => {
    const obj = Obj.make(Person, { name: 'John' });
    expect(isEchoObject(obj)).toBe(false);

    // Should not throw - just calls the callback directly.
    Obj.change(obj, (p) => {
      p.name = 'Jane';
    });

    expect(obj.name).toBe('Jane');
  });

  test('meta operations within Obj.change', ({ expect }) => {
    const obj = createObject(Obj.make(Person, { name: 'John' }));

    Obj.change(obj, () => {
      Obj.addTag(obj, 'important');
    });

    const meta = Obj.getMeta(obj);
    expect(meta.tags).toContain('important');
  });

  test('Obj.setValue within Obj.change', ({ expect }) => {
    const obj = createObject(Obj.make(Person, { name: 'John' }));

    Obj.change(obj, () => {
      Obj.setValue(obj, ['age'], 25);
    });

    expect(obj.age).toBe(25);
  });

  test('Obj.setValue outside Obj.change throws', ({ expect }) => {
    const obj = createObject(Obj.make(Person, { name: 'John' }));

    expect(() => {
      Obj.setValue(obj, ['age'], 25);
    }).toThrow(/Cannot modify ECHO object property.*outside of Obj.change/);
  });
});
