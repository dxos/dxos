//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, test, vi } from 'vitest';

import { DXN, Obj, Type } from '@dxos/echo';

import { makeSelectHandle } from './select-handle.ts';

class TestObject extends Type.makeObject<TestObject>(DXN.make('com.example.type.testObject', '0.1.0'))(
  Schema.Struct({ name: Schema.optional(Schema.String) }),
) {}

describe('makeSelectHandle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('a selection settles once; the unmount that follows it is not a dismissal', ({ expect }) => {
    const onSettled = vi.fn();
    const handle = makeSelectHandle(onSettled);
    const object = Obj.make(TestObject, { name: 'test' });
    handle.select(object);
    handle.dismiss();
    vi.runAllTimers();
    expect(onSettled.mock.calls).toEqual([[object]]);
  });

  test('a StrictMode remount takes the dismissal back', ({ expect }) => {
    const onSettled = vi.fn();
    const handle = makeSelectHandle(onSettled);
    handle.dismiss();
    handle.retain();
    vi.runAllTimers();
    expect(onSettled).not.toHaveBeenCalled();
  });

  test('closing the dialog settles with nothing', ({ expect }) => {
    const onSettled = vi.fn();
    const handle = makeSelectHandle(onSettled);
    handle.dismiss();
    vi.runAllTimers();
    expect(onSettled.mock.calls).toEqual([[undefined]]);
  });
});
