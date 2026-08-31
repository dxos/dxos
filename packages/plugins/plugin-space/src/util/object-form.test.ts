//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { afterEach, beforeEach, describe, test, vi } from 'vitest';

import { DXN, Obj, type Ref, Type } from '@dxos/echo';

import { makeObjectFormHandle } from './object-form';

class TestObject extends Type.makeObject<TestObject>(DXN.make('com.example.type.testObject', '0.1.0'))(
  Schema.Struct({ name: Schema.optional(Schema.String) }),
) {}

const spy = () => vi.fn<(result?: Ref.Ref<Obj.Unknown>) => void>();

/** Deterministically flushes `object-form.ts`'s internal zero-delay `setTimeout`. */
const tick = () => vi.advanceTimersByTimeAsync(0);

describe('makeObjectFormHandle', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('settles synchronously with a ref to the object', ({ expect }) => {
    const onSettled = spy();
    const handle = makeObjectFormHandle(onSettled);
    const object = Obj.make(TestObject, { name: 'test' });

    handle.settle(object);
    expect(onSettled).toHaveBeenCalledTimes(1);
    expect(onSettled.mock.calls[0][0]?.target).toBe(object);
  });

  test('dismiss settles with nothing, but only after the current task', async ({ expect }) => {
    const onSettled = spy();
    const handle = makeObjectFormHandle(onSettled);

    handle.dismiss();
    expect(onSettled).not.toHaveBeenCalled();
    await tick();
    expect(onSettled).toHaveBeenCalledWith(undefined);
  });

  // The StrictMode remount: the unmount cleanup dismisses and the immediate remount takes it back,
  // both within the same task, so a cancel the user never made is never reported.
  test('retain takes back a pending dismissal', async ({ expect }) => {
    const onSettled = spy();
    const handle = makeObjectFormHandle(onSettled);

    handle.dismiss();
    handle.retain();
    await tick();
    expect(onSettled).not.toHaveBeenCalled();

    handle.dismiss();
    await tick();
    expect(onSettled).toHaveBeenCalledTimes(1);
  });

  // The draft path: the dialog closes (and so unmounts) before the object it is creating exists.
  test('confirm suppresses the dismissal the confirm itself triggers', async ({ expect }) => {
    const onSettled = spy();
    const handle = makeObjectFormHandle(onSettled);

    handle.confirm();
    handle.dismiss();
    await tick();
    expect(onSettled).not.toHaveBeenCalled();

    const object = Obj.make(TestObject, {});
    handle.settle(object);
    expect(onSettled.mock.calls[0][0]?.target).toBe(object);
  });

  test('settles at most once', async ({ expect }) => {
    const onSettled = spy();
    const handle = makeObjectFormHandle(onSettled);

    handle.settle(Obj.make(TestObject, {}));
    handle.dismiss();
    await tick();
    expect(onSettled).toHaveBeenCalledTimes(1);
    expect(onSettled.mock.calls[0][0]).toBeDefined();
  });
});
