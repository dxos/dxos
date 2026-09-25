//
// Copyright 2026 DXOS.org
//

import { VanillaMachine } from '@zag-js/vanilla';
import { describe, test } from 'vitest';

import { type MultiSelectProps, type MultiSelectSchema, connect, multiSelectMachine } from './multi-select.ts';

const ITEMS = ['a', 'b', 'c', 'd', 'e'];

/** Zag's runtimes defer `send` to a microtask; one turn drains every event queued before it. */
const settle = () => new Promise<void>((resolve) => queueMicrotask(resolve));

const createService = (props?: MultiSelectProps) => {
  const machine = new VanillaMachine<MultiSelectSchema>(multiSelectMachine, props);
  machine.start();
  return machine.service;
};

describe('multiSelectMachine', () => {
  test('plain select replaces the selection', async ({ expect }) => {
    const service = createService();
    connect(service).select('a');
    await settle();
    expect([...connect(service).selection]).toEqual(['a']);

    connect(service).select('b');
    await settle();
    expect([...connect(service).selection]).toEqual(['b']);
    expect(connect(service).anchor).toBe('b');
  });

  test('shift-select toggles ids in and out', async ({ expect }) => {
    const service = createService();
    connect(service).select('a');
    connect(service).select('b', true);
    connect(service).select('c', true);
    await settle();
    expect([...connect(service).selection].sort()).toEqual(['a', 'b', 'c']);

    connect(service).select('b', true);
    await settle();
    expect([...connect(service).selection].sort()).toEqual(['a', 'c']);
    expect(connect(service).isSelected('b')).toBe(false);
  });

  test('extend ranges from the anchor over the ordered items', async ({ expect }) => {
    const service = createService({ items: ITEMS });
    connect(service).select('b');
    connect(service).extendTo('d');
    await settle();
    expect([...connect(service).selection].sort()).toEqual(['b', 'c', 'd']);

    // The anchor survives, so a second extend re-ranges from it — backwards included.
    connect(service).extendTo('a');
    await settle();
    expect([...connect(service).selection].sort()).toEqual(['a', 'b']);
  });

  test('extend without an anchor or item order degrades to a toggle', async ({ expect }) => {
    const service = createService();
    connect(service).extendTo('c');
    await settle();
    expect([...connect(service).selection]).toEqual(['c']);

    connect(service).extendTo('c');
    await settle();
    expect(connect(service).selection.size).toBe(0);
  });

  test('clear empties the selection and drops the anchor', async ({ expect }) => {
    const service = createService({ items: ITEMS });
    connect(service).select('b');
    connect(service).select('d', true);
    connect(service).clear();
    await settle();
    expect(connect(service).selection.size).toBe(0);

    // No anchor left: the next extend toggles instead of ranging.
    connect(service).extendTo('e');
    await settle();
    expect([...connect(service).selection]).toEqual(['e']);
  });

  test('onChange reports each committed selection', async ({ expect }) => {
    const seen: string[][] = [];
    const service = createService({
      onChange: ({ selection }) => seen.push([...selection].sort()),
    });
    connect(service).select('a');
    connect(service).select('b', true);
    connect(service).clear();
    await settle();
    expect(seen).toEqual([['a'], ['a', 'b'], []]);
  });
});
