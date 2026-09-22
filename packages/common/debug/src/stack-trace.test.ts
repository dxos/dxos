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

  // JavaScriptCore (Safari, and tauri's WKWebView) emits no `Error` header before the frames, so a
  // constant offset skips one real frame too many there and returns nothing at all on a shallow
  // stack — which made `Context.onDispose`'s leak warning throw instead of report (DX-1299).
  test('reads the same frame whether or not the engine emits a header line', ({ expect }) => {
    const v8 = new StackTrace();
    Reflect.set(v8, '_frames', ['Error', '    at new StackTrace (stack-trace.ts:1:1)', '    at caller (a.ts:2:2)']);
    const jsc = new StackTrace();
    Reflect.set(jsc, '_frames', ['new StackTrace@stack-trace.ts:1:1', 'caller@a.ts:2:2']);

    expect(v8.getStackArray()[0]).toBe('    at caller (a.ts:2:2)');
    expect(jsc.getStackArray()[0]).toBe('caller@a.ts:2:2');
  });

  test('a stack the engine did not provide yields no frames rather than throwing', ({ expect }) => {
    const trace = new StackTrace();
    Reflect.set(trace, '_frames', []);
    expect(trace.getStackArray()).toEqual([]);
    expect(trace.getStackArray(1)).toEqual([]);
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
