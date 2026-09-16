//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { StackTrace } from './stack-trace.ts';

describe('StackTrace', () => {
  test('skips the Error line and the capture frame', ({ expect }) => {
    const frames = new StackTrace().getStackArray();
    expect(frames.length).toBeGreaterThan(0);
    expect(frames[0]).not.toContain('new StackTrace');
    // Callers such as `Context` read a frame by index, so this offset must stay stable. Capturing in
    // a field initializer rather than the constructor body silently shifts it by one.
    expect(frames[0]).toContain('stack-trace.test.ts');
  });

  test('formatting is idempotent', ({ expect }) => {
    const trace = new StackTrace();
    expect(trace.getStack()).toBe(trace.getStack());
    expect(trace.getStackArray(1).join('\n')).toBe(trace.getStack(1));
  });

  // An unformatted trace holds V8's structured frames, and each frame strongly references its
  // receiver — so a retained-but-never-formatted trace pins every `this` that was on the stack at
  // capture time. Dropping the `Error` is what releases them, so this asserts on the field directly:
  // the equivalent black-box check needs GC plus `FinalizationRegistry`, which this package's `lib`
  // excludes. `echo-client`'s query-result test covers the end-to-end collectability (DX-1140).
  test('releases the captured Error once formatted', ({ expect }) => {
    const trace = new StackTrace();
    expect(Reflect.get(trace, '_error')).toBeInstanceOf(Error);
    void trace.getStack();
    expect(Reflect.get(trace, '_error')).toBeUndefined();
  });
});
