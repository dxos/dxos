//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { change, ChangeId, subscribe } from './live';
import { live } from './object';

describe('change', () => {
  test('change on plain object calls callback directly', ({ expect }) => {
    const obj = { name: 'John', age: 25 };

    change(obj, (o) => {
      o.name = 'Jane';
      o.age = 30;
    });

    expect(obj.name).toBe('Jane');
    expect(obj.age).toBe(30);
  });

  test('change on live object calls callback directly', ({ expect }) => {
    const obj = live({ name: 'John', age: 25 });

    change(obj, (o) => {
      o.name = 'Jane';
      o.age = 30;
    });

    expect(obj.name).toBe('Jane');
    expect(obj.age).toBe(30);
  });

  test('change on object with ChangeId handler uses the handler', ({ expect }) => {
    let changeCallCount = 0;
    const callbackArgs: any[] = [];

    const obj = {
      name: 'John',
      [ChangeId]: (callback: (o: any) => void) => {
        changeCallCount++;
        callbackArgs.push(callback);
        callback(obj);
      },
    };

    change(obj, (o) => {
      o.name = 'Jane';
    });

    expect(changeCallCount).toBe(1);
    expect(callbackArgs.length).toBe(1);
    expect(obj.name).toBe('Jane');
  });

  test('change handler can implement batching', ({ expect }) => {
    let batchedCallbackExecuted = false;
    const mutations: string[] = [];

    const obj = {
      name: 'John',
      age: 25,
      [ChangeId]: (callback: (o: any) => void) => {
        // Custom handler that tracks mutations.
        const proxy = new Proxy(obj, {
          set(target, prop, value) {
            mutations.push(`${String(prop)}=${value}`);
            return Reflect.set(target, prop, value);
          },
        });
        callback(proxy);
        batchedCallbackExecuted = true;
      },
    };

    change(obj, (o) => {
      o.name = 'Jane';
      o.age = 30;
    });

    expect(batchedCallbackExecuted).toBe(true);
    expect(mutations).toEqual(['name=Jane', 'age=30']);
    expect(obj.name).toBe('Jane');
    expect(obj.age).toBe(30);
  });

  test('change handler can implement readonly enforcement', ({ expect }) => {
    let inChangeContext = false;

    const obj = {
      _name: 'John',
      get name() {
        return this._name;
      },
      set name(value: string) {
        if (!inChangeContext) {
          throw new Error('Cannot modify outside change context');
        }
        this._name = value;
      },
      [ChangeId]: (callback: (o: any) => void) => {
        inChangeContext = true;
        try {
          callback(obj);
        } finally {
          inChangeContext = false;
        }
      },
    };

    // Mutation outside change throws.
    expect(() => {
      obj.name = 'Jane';
    }).toThrow('Cannot modify outside change context');

    // Mutation inside change works.
    change(obj, (o) => {
      o.name = 'Jane';
    });
    expect(obj.name).toBe('Jane');

    // After change, mutation throws again.
    expect(() => {
      obj.name = 'Bob';
    }).toThrow('Cannot modify outside change context');
  });
});

describe('subscribe', () => {
  test('subscribe on live object receives notifications', ({ expect }) => {
    const obj = live({ name: 'John' });

    let notificationCount = 0;
    const unsubscribe = subscribe(obj, () => {
      notificationCount++;
    });

    obj.name = 'Jane';
    expect(notificationCount).toBe(1);

    obj.name = 'Bob';
    expect(notificationCount).toBe(2);

    unsubscribe();
    obj.name = 'Alice';
    expect(notificationCount).toBe(2); // No more notifications after unsubscribe.
  });
});
