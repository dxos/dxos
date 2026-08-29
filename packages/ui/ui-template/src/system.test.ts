//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { parse } from './parser';
import { type Registry, SystemError, dispatch, seedUi, withInstance } from './system';

const registry: Registry<never> = {
  schemas: {},
  machines: {
    'org.dxos.machine.master-detail': {
      key: 'org.dxos.machine.master-detail',
      initial: { selection: undefined, draft: false },
    },
  },
  operations: {
    'org.dxos.operation.select': {
      key: 'org.dxos.operation.select',
      handler: ({ ui, payload }) => withInstance(ui, 'contacts', { ...ui.contacts, selection: payload }),
    },
    'org.dxos.operation.noop': {
      key: 'org.dxos.operation.noop',
      handler: () => undefined,
    },
  },
};

describe('seedUi', () => {
  test('an instance declaring id + machine is seeded from the registry', ({ expect }) => {
    const node = parse(
      '<container><collection id="contacts" machine="org.dxos.machine.master-detail" data-items="rows" /></container>',
    );
    expect(seedUi(registry, node)).toEqual({ contacts: { selection: undefined, draft: false } });
  });

  test('anonymous instances publish nothing', ({ expect }) => {
    const node = parse('<container><collection data-items="rows" /></container>');
    expect(seedUi(registry, node)).toEqual({});
  });

  test('an unknown machine is an error, not an empty slot', ({ expect }) => {
    const node = parse('<collection id="contacts" machine="org.dxos.machine.missing" data-items="rows" />');
    expect(() => seedUi(registry, node)).toThrow(SystemError);
  });
});

describe('dispatch', () => {
  test('steps ui state and logs the operation', ({ expect }) => {
    const { ui, entry } = dispatch(registry, {}, 'org.dxos.operation.select', 'org-1');
    expect(ui.contacts?.selection).toBe('org-1');
    expect(entry).toEqual({ operation: 'org.dxos.operation.select', payload: 'org-1' });
  });

  test('a handler returning nothing leaves ui unchanged', ({ expect }) => {
    const before = { contacts: { selection: 'org-1' } };
    const { ui } = dispatch(registry, before, 'org.dxos.operation.noop');
    expect(ui).toBe(before);
  });

  test('an unknown operation is an error', ({ expect }) => {
    expect(() => dispatch(registry, {}, 'org.dxos.operation.missing')).toThrow(SystemError);
  });
});
