//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { parse } from './parser';
import { type Registry, type SlotFrame, SystemError, dispatch, seedUi } from './system';

const registry: Registry<never> = {
  schemas: {},
  machines: {
    'org.dxos.machine.selection': {
      key: 'org.dxos.machine.selection',
      initial: undefined,
    },
    'org.dxos.machine.flag': {
      key: 'org.dxos.machine.flag',
      initial: false,
    },
  },
  operations: {
    'org.dxos.operation.select': {
      key: 'org.dxos.operation.select',
      handler: ({ scope, payload }) => scope.set({ selection: payload }),
    },
    'org.dxos.operation.reset': {
      key: 'org.dxos.operation.reset',
      handler: ({ scope }) => scope.set({ missing: true }),
    },
    'org.dxos.operation.noop': {
      key: 'org.dxos.operation.noop',
      handler: () => undefined,
    },
  },
};

const CONTACTS_FRAME: SlotFrame = { path: ['contacts'], slots: ['selection'] };

describe('seedUi', () => {
  test('a let under a scoped element is seeded at ui.<id>.<name>', ({ expect }) => {
    const node = parse(
      '<container id="contacts">' +
        '<let name="selection" machine="org.dxos.machine.selection" />' +
        '<let name="draft" machine="org.dxos.machine.flag" />' +
        '<collection data-items="rows" />' +
        '</container>',
    );
    expect(seedUi(registry, node)).toEqual({ contacts: { selection: undefined, draft: false } });
  });

  test('nested scopes seed at the id path', ({ expect }) => {
    const node = parse(
      '<container id="outer">' +
        '<let name="draft" machine="org.dxos.machine.flag" />' +
        '<container id="inner">' +
        '<let name="selection" machine="org.dxos.machine.selection" />' +
        '</container>' +
        '</container>',
    );
    expect(seedUi(registry, node)).toEqual({ outer: { draft: false, inner: { selection: undefined } } });
  });

  test('anonymous elements publish nothing', ({ expect }) => {
    const node = parse('<container><collection data-items="rows" /></container>');
    expect(seedUi(registry, node)).toEqual({});
  });

  test('an unknown machine is an error, not an empty slot', ({ expect }) => {
    const node = parse('<container id="contacts"><let name="x" machine="org.dxos.machine.missing" /></container>');
    expect(() => seedUi(registry, node)).toThrow(SystemError);
  });
});

describe('dispatch', () => {
  test('scope.set writes the nested slot and logs the operation', ({ expect }) => {
    const { ui, entry } = dispatch(registry, {}, 'org.dxos.operation.select', 'org-1', undefined, [CONTACTS_FRAME]);
    expect(ui).toEqual({ contacts: { selection: 'org-1' } });
    expect(entry).toEqual({ operation: 'org.dxos.operation.select', payload: 'org-1' });
  });

  test('scope.get resolves through the innermost frame declaring the name', ({ expect }) => {
    const before = { app: { selection: 'outer', contacts: { selection: 'inner' } } };
    const frames: SlotFrame[] = [
      { path: ['app'], slots: ['selection'] },
      { path: ['app', 'contacts'], slots: ['selection'] },
    ];
    let seen: unknown;
    const probe: Registry<never> = {
      ...registry,
      operations: {
        'org.dxos.operation.probe': {
          key: 'org.dxos.operation.probe',
          handler: ({ scope }) => {
            seen = scope.get('selection');
          },
        },
      },
    };
    dispatch(probe, before, 'org.dxos.operation.probe', undefined, undefined, frames);
    expect(seen).toBe('inner');
  });

  test('setting an undeclared name is an error, never a root write', ({ expect }) => {
    expect(() => dispatch(registry, {}, 'org.dxos.operation.reset', undefined, undefined, [CONTACTS_FRAME])).toThrow(
      SystemError,
    );
  });

  test('a handler returning nothing but calling scope.set changes ui', ({ expect }) => {
    const before = { contacts: { selection: undefined } };
    const { ui } = dispatch(registry, before, 'org.dxos.operation.select', 'org-2', undefined, [CONTACTS_FRAME]);
    expect(ui).not.toBe(before);
    expect(ui).toEqual({ contacts: { selection: 'org-2' } });
  });

  test('a handler touching nothing leaves ui unchanged', ({ expect }) => {
    const before = { contacts: { selection: 'org-1' } };
    const { ui } = dispatch(registry, before, 'org.dxos.operation.noop');
    expect(ui).toBe(before);
  });

  test('an unknown operation is an error', ({ expect }) => {
    expect(() => dispatch(registry, {}, 'org.dxos.operation.missing')).toThrow(SystemError);
  });
});

//
// Render-level tests use a string renderer to keep the assertions framework-free.
//

const makeStringRenderer = (): import('./render').Renderer<string | null> => {
  type Props = import('./render').RenderProps<string | null>;
  const echoTag = (tag: string) => (props: Props) =>
    `${tag}(${String(props.data.text ?? props.props.label ?? '')}${props.children.join(',')})`;
  // Structural tags render nothing, mirroring the React renderer's null entries; the `Renderer`
  // mapped type enforces the full tag set at compile time.
  const none = () => null;
  return {
    container: echoTag('container'),
    layout: echoTag('layout'),
    display: echoTag('display'),
    control: echoTag('control'),
    collection: echoTag('collection'),
    command: echoTag('command'),
    form: echoTag('form'),
    combobox: echoTag('combobox'),
    tabs: echoTag('tabs'),
    tab: none,
    switch: echoTag('switch'),
    match: none,
    show: echoTag('show'),
    fallback: none,
    let: none,
  };
};

describe('switch/match', () => {
  test('renders only the match equal to the resolved on binding', async ({ expect }) => {
    const { render } = await import('./render');
    const renderer = makeStringRenderer();
    const node = parse(
      '<switch on="view.mode">' +
        '<match value="list"><display label="the-list" /></match>' +
        '<match value="detail"><display label="the-detail" /></match>' +
        '</switch>',
    );

    expect(render(node, { state: { view: { mode: 'list' } } }, renderer)).toBe('switch(display(the-list))');
    expect(render(node, { state: { view: { mode: 'detail' } } }, renderer)).toBe('switch(display(the-detail))');
    expect(render(node, { state: {} }, renderer)).toBe('switch()');
  });
});

describe('show/fallback', () => {
  test('present renders the children, absent renders the fallback children', async ({ expect }) => {
    const { render } = await import('./render');
    const renderer = makeStringRenderer();
    const node = parse(
      '<show when="selected">' +
        '<display label="the-detail" />' +
        '<fallback><display label="nothing" /></fallback>' +
        '</show>',
    );

    expect(render(node, { state: { selected: { id: 'org-1' } } }, renderer)).toBe('show(display(the-detail))');
    expect(render(node, { state: { selected: false } }, renderer)).toBe('show(display(nothing))');
    expect(render(node, { state: {} }, renderer)).toBe('show(display(nothing))');
  });
});

describe('lexical resolution', () => {
  test('a slot name resolves through the enclosing scope frame to published state', async ({ expect }) => {
    const { render } = await import('./render');
    const renderer = makeStringRenderer();
    const node = parse(
      '<container id="contacts">' +
        '<let name="selection" machine="org.dxos.machine.selection" />' +
        '<display data-text="selection" />' +
        '</container>',
    );

    const state = { ui: { contacts: { selection: 'org-1' } } };
    expect(render(node, { state }, renderer)).toBe('container(display(org-1))');
    // An undeclared name still falls back to the root state object.
    expect(render(parse('<display data-text="title" />'), { state: { title: 'root' } }, renderer)).toBe(
      'display(root)',
    );
  });
});
