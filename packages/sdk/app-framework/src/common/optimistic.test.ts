//
// Copyright 2026 DXOS.org
//

import * as Atom from 'effect/unstable/reactivity/Atom';
import * as AtomRegistry from 'effect/unstable/reactivity/AtomRegistry';
import { afterEach, describe, test, vi } from 'vitest';

import * as Optimistic from './optimistic';

describe('Optimistic.make', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  test('passes source rows through when no entries are registered', ({ expect }) => {
    const { emissions, emit } = setup([1, 2, 3]);
    expect(latest(emissions)).toEqual([1, 2, 3]);

    emit([4, 5]);
    expect(latest(emissions)).toEqual([4, 5]);
  });

  test('an apply entry transforms the rows synchronously on registration', ({ expect }) => {
    const { overlay, emissions } = setup([1, 2, 3]);
    overlay.mutate({ apply: (rows) => [...rows].reverse() });
    expect(latest(emissions)).toEqual([3, 2, 1]);
  });

  test('a pending entry survives source emissions until settle', ({ expect }) => {
    const { overlay, emissions, emit } = setup([1, 2, 3]);
    overlay.mutate({ apply: (rows) => [...rows].reverse() });

    emit([1, 2, 3, 4]);
    expect(latest(emissions)).toEqual([4, 3, 2, 1]);
  });

  test('a committed entry retires on the first source emission after settle, not at settle', ({ expect }) => {
    const { overlay, emissions, emit } = setup([1, 2, 3]);
    const handle = overlay.mutate({ apply: (rows) => [rows[2], ...rows.slice(0, 2)] });
    expect(latest(emissions)).toEqual([3, 1, 2]);

    // Settle alone must not change the rendered order — the query emit may lag the promise.
    handle.commit();
    expect(latest(emissions)).toEqual([3, 1, 2]);

    // The emission carrying the write renders the raw source: the entry has retired.
    emit([3, 1, 2]);
    expect(latest(emissions)).toEqual([3, 1, 2]);

    emit([3, 1, 2, 4]);
    expect(latest(emissions)).toEqual([3, 1, 2, 4]);
  });

  test('a failed entry drops immediately (auto-revert)', ({ expect }) => {
    const { overlay, emissions } = setup([1, 2, 3]);
    const handle = overlay.mutate({ apply: (rows) => [...rows].reverse() });
    expect(latest(emissions)).toEqual([3, 2, 1]);

    handle.revert();
    expect(latest(emissions)).toEqual([1, 2, 3]);
  });

  test('entries retire independently across out-of-order completions', ({ expect }) => {
    const { overlay, emissions, emit } = setup([1, 2, 3]);
    const first = overlay.mutate({ apply: (rows) => [...rows, 10] });
    const second = overlay.mutate({ apply: (rows) => [...rows, 20] });
    expect(latest(emissions)).toEqual([1, 2, 3, 10, 20]);

    // The later entry settles first (completion order is not issue order).
    second.commit();
    emit([1, 2, 3, 20]);
    expect(latest(emissions)).toEqual([1, 2, 3, 20, 10]);

    first.commit();
    emit([1, 2, 3, 20, 10]);
    expect(latest(emissions)).toEqual([1, 2, 3, 20, 10]);
  });

  test('entries apply in registration order', ({ expect }) => {
    const { overlay, emissions } = setup([1, 2, 3]);
    overlay.mutate({ apply: (rows) => [...rows, 10] });
    overlay.mutate({ apply: (rows) => [...rows].reverse() });
    expect(latest(emissions)).toEqual([10, 3, 2, 1]);
  });

  test('commit and revert are idempotent and safe after retirement', ({ expect }) => {
    const { overlay, emissions, emit } = setup([1, 2, 3]);
    const handle = overlay.mutate({ apply: (rows) => [...rows].reverse() });
    handle.commit();
    emit([3, 2, 1]);
    expect(latest(emissions)).toEqual([3, 2, 1]);

    const count = emissions.length;
    handle.commit();
    handle.revert();
    expect(emissions.length).toBe(count);
    expect(latest(emissions)).toEqual([3, 2, 1]);
  });

  test('a retain entry pins evicted rows at their captured position', ({ expect }) => {
    const { overlay, emissions, emit } = setup([1, 2, 3]);
    overlay.mutate({ retain: (row) => row === 2 });

    emit([1, 3]);
    expect(latest(emissions)).toEqual([1, 2, 3]);
    expect(overlay.isLeaving(2)).toBe(true);
    expect(overlay.isLeaving(1)).toBe(false);
  });

  test('a retained row present in the source is not leaving', ({ expect }) => {
    const { overlay, emissions, emit } = setup([1, 2, 3]);
    overlay.mutate({ retain: (row) => row === 2 });

    emit([1, 3]);
    expect(overlay.isLeaving(2)).toBe(true);

    // The undo landed: the row is back in the source, so the pin is dormant.
    emit([1, 2, 3]);
    expect(latest(emissions)).toEqual([1, 2, 3]);
    expect(overlay.isLeaving(2)).toBe(false);
  });

  test('a retain entry releases on grace expiry after commit', ({ expect }) => {
    vi.useFakeTimers();
    const { overlay, emissions, emit } = setup([1, 2, 3]);
    const handle = overlay.mutate({ retain: (row) => row === 2, graceMs: 50 });

    emit([1, 3]);
    expect(latest(emissions)).toEqual([1, 2, 3]);

    handle.commit();
    vi.advanceTimersByTime(49);
    expect(latest(emissions)).toEqual([1, 2, 3]);

    vi.advanceTimersByTime(1);
    expect(latest(emissions)).toEqual([1, 3]);
    expect(overlay.isLeaving(2)).toBe(false);
  });

  test('a retain entry without grace holds until explicit release', ({ expect }) => {
    const { overlay, emissions, emit } = setup([1, 2, 3]);
    const handle = overlay.mutate({ retain: (row) => row === 2 });
    handle.commit();

    emit([1, 3]);
    emit([1]);
    expect(latest(emissions)).toEqual([1, 2]);

    handle.revert();
    expect(latest(emissions)).toEqual([1]);
  });

  test('a retain entry releases on explicit revert before settle', ({ expect }) => {
    const { overlay, emissions, emit } = setup([1, 2, 3]);
    const handle = overlay.mutate({ retain: (row) => row === 2 });

    emit([1, 3]);
    expect(latest(emissions)).toEqual([1, 2, 3]);

    handle.revert();
    expect(latest(emissions)).toEqual([1, 3]);
  });

  test('retain matches re-emitted rows by logical key, not reference', ({ expect }) => {
    type Row = { id: string };
    const registry = AtomRegistry.make();
    const source = Atom.make<readonly Row[]>([{ id: '1' }, { id: '2' }]);
    const overlay = Optimistic.make(source);
    const emissions: (readonly Row[])[] = [];
    registry.subscribe(overlay.atom, (rows) => emissions.push(rows), { immediate: true });

    overlay.mutate({ retain: (row) => row.id === '2', keyOf: (row) => row.id });
    // The source re-emits row 2 as a FRESH object: with reference equality the pin would
    // duplicate it; with the key it is recognized as present.
    registry.set(source, [{ id: '1' }, { id: '2' }]);
    expect(emissions[emissions.length - 1].map((row) => row.id)).toEqual(['1', '2']);

    // Dropping the logical row pins the captured instance in place.
    registry.set(source, [{ id: '1' }]);
    expect(emissions[emissions.length - 1].map((row) => row.id)).toEqual(['1', '2']);
    expect(overlay.isLeaving(emissions[emissions.length - 1][1])).toBe(true);
  });
});

// Helpers after the suite, per test-structure conventions.

const setup = (initial: readonly number[]) => {
  const registry = AtomRegistry.make();
  const source = Atom.make<readonly number[]>(initial);
  const overlay = Optimistic.make(source);
  const emissions: (readonly number[])[] = [];
  const unsubscribe = registry.subscribe(overlay.atom, (rows) => emissions.push(rows), { immediate: true });
  const emit = (rows: readonly number[]) => registry.set(source, rows);
  return { registry, overlay, emissions, emit, unsubscribe };
};

const latest = (emissions: (readonly number[])[]): readonly number[] => emissions[emissions.length - 1];
