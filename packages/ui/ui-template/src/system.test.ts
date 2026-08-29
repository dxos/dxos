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

describe('switch/case', () => {
  test('renders only the case matching published state', async ({ expect }) => {
    const { render } = await import('./render');
    const node = parse(
      '<switch data-value="ui.view.mode">' +
        '<case value="list"><display label="the-list" /></case>' +
        '<case value="detail"><display label="the-detail" /></case>' +
        '</switch>',
    );
    // A string renderer keeps the assertion framework-free.
    const echoTag = (tag: string) => (props: { children: readonly string[]; props: Record<string, unknown> }) =>
      `${tag}(${String(props.props.label ?? '')}${props.children.join(',')})`;
    const renderer = Object.fromEntries(
      (
        [
          'container',
          'layout',
          'display',
          'control',
          'collection',
          'command',
          'form',
          'combobox',
          'tabs',
          'tab',
          'switch',
          'case',
        ] as const
      ).map((tag) => [tag, echoTag(tag)]),
    ) as import('./render').Renderer<string>;

    expect(render(node, { state: { ui: { view: { mode: 'list' } } } }, renderer)).toBe('switch(display(the-list))');
    expect(render(node, { state: { ui: { view: { mode: 'detail' } } } }, renderer)).toBe('switch(display(the-detail))');
    expect(render(node, { state: { ui: {} } }, renderer)).toBe('switch()');
  });
});
