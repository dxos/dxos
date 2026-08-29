//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { parse } from './parser';
import {
  type ModuleDef,
  type Registry,
  type SlotFrame,
  SystemError,
  checkUses,
  checkVars,
  createModuleReader,
  dispatch,
  fromSlot,
  seedModules,
  seedUi,
  varDecls,
  viewModules,
} from './system';

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
  modules: {},
};

const CONTACTS_FRAME: SlotFrame = { path: ['contacts'], slots: ['selection'] };

describe('seedUi', () => {
  test('a let under a scoped element is seeded at ui.<id>.<name>', ({ expect }) => {
    const node = parse(
      '<container id="contacts">' +
        '<let name="selection" machine="org.dxos.machine.selection" />' +
        '<let name="draft" machine="org.dxos.machine.flag" />' +
        '</container>',
    );
    expect(seedUi(registry, node)).toEqual({ contacts: { selection: undefined, draft: false } });
  });

  test('a rung-1 let is seeded from its literal initial value', ({ expect }) => {
    const node = parse(
      '<container id="filter">' +
        '<let name="text" initial="" />' +
        '<let name="count" initial="3" />' +
        '<let name="open" initial="true" />' +
        '</container>',
    );
    expect(seedUi(registry, node)).toEqual({ filter: { text: '', count: 3, open: true } });
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
    const node = parse('<container><display label="static" /></container>');
    expect(seedUi(registry, node)).toEqual({});
  });

  test('a rung-3 from= let is not seeded — the owning module seeds the instance', ({ expect }) => {
    const node = parse(
      '<container id="s">' +
        '<use module="org.dxos.module.contacts" as="contacts" />' +
        '<let name="selection" from="contacts.selection" />' +
        '<let name="draft" initial="false" />' +
        '</container>',
    );
    expect(seedUi(registry, node)).toEqual({ s: { draft: false } });
  });

  test('an unknown machine is an error, not an empty slot', ({ expect }) => {
    const node = parse('<container id="contacts"><let name="x" machine="org.dxos.machine.missing" /></container>');
    expect(() => seedUi(registry, node)).toThrow(SystemError);
  });
});

describe('dispatch', () => {
  test('scope.set writes the nested slot and logs the operation', ({ expect }) => {
    const { ui, entries } = dispatch(registry, {}, 'org.dxos.operation.select', 'org-1', undefined, [CONTACTS_FRAME]);
    expect(ui).toEqual({ contacts: { selection: 'org-1' } });
    expect(entries).toEqual([{ operation: 'org.dxos.operation.select', payload: 'org-1' }]);
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
    var: none,
    use: none,
  };
};

describe('modules', () => {
  const COUNTER = 'org.dxos.module.counter';
  const counter: ModuleDef<never> = {
    key: COUNTER,
    slots: { count: { initial: 0 } },
    state: {
      count: fromSlot('count'),
      doubled: { derive: ({ slots }) => Number(slots.count) * 2 },
      scaled: { derive: ({ slots, inputs }) => Number(slots.count) * Number(inputs.factor ?? 1) },
    },
    operations: {
      increment: {
        key: 'org.dxos.operation.counter.increment',
        handler: ({ scope }) => scope.set({ count: Number(scope.get('count')) + 1 }),
      },
      escape: {
        key: 'org.dxos.operation.counter.escape',
        handler: ({ scope }) => scope.set({ other: 1 }),
      },
      wholesale: {
        key: 'org.dxos.operation.counter.wholesale',
        handler: () => ({ hijacked: true }),
      },
    },
    capabilities: {
      counter: { machine: 'org.dxos.machine.selection', slot: 'count' },
    },
  };
  const withCounter: Registry<never> = { ...registry, modules: { [COUNTER]: counter } };

  test('module slots seed at ui.<moduleKey>.<slot>', ({ expect }) => {
    expect(seedModules(withCounter)).toEqual({ [COUNTER]: { count: 0 } });
  });

  test('state exports derive from slots and inputs; unknown exports and modules are errors', ({ expect }) => {
    const read = createModuleReader(withCounter, () => ({ [COUNTER]: { count: 3 } }), {
      [COUNTER]: { factor: 10 },
    });
    expect(read(COUNTER, 'count')).toBe(3);
    expect(read(COUNTER, 'doubled')).toBe(6);
    expect(read(COUNTER, 'scaled')).toBe(30);
    expect(() => read(COUNTER, 'missing')).toThrow(SystemError);
    expect(() => read('org.dxos.module.missing', 'count')).toThrow(SystemError);
  });

  test('viewModules materializes the state and capability columns with every export present', ({ expect }) => {
    const views = viewModules(withCounter, { [COUNTER]: { count: 2 } });
    expect(views[COUNTER].state).toEqual({ count: 2, doubled: 4, scaled: 2 });
    expect(views[COUNTER].capabilities).toEqual({ counter: 2 });
  });

  test('a module operation runs against its own slots, without template frames', ({ expect }) => {
    const { ui, entries } = dispatch(withCounter, { [COUNTER]: { count: 1 } }, 'org.dxos.operation.counter.increment');
    expect(ui).toEqual({ [COUNTER]: { count: 2 } });
    expect(entries).toEqual([{ operation: 'org.dxos.operation.counter.increment', payload: undefined }]);
  });

  test('write ownership: a module operation cannot touch a slot it does not own', ({ expect }) => {
    expect(() => dispatch(withCounter, seedModules(withCounter), 'org.dxos.operation.counter.escape')).toThrow(
      /owns no slot 'other'/,
    );
  });

  test('a module operation may not replace the ui tree wholesale', ({ expect }) => {
    expect(() => dispatch(withCounter, seedModules(withCounter), 'org.dxos.operation.counter.wholesale')).toThrow(
      /must write through scope.set/,
    );
  });

  test('checkUses reports unknown modules and dangling capabilities', ({ expect }) => {
    const node = parse(
      '<container id="s">' +
        '<use module="org.dxos.module.missing" as="gone" />' +
        '<use module="org.dxos.module.counter" as="counter" />' +
        '<let name="value" from="counter.counter" />' +
        '<let name="bad" from="counter.missing" />' +
        '<display data-text="value" />' +
        '</container>',
    );
    expect(checkUses(withCounter, node)).toEqual([
      `use 'gone': unknown module 'org.dxos.module.missing'`,
      `let from 'counter.missing': unknown capability on module 'org.dxos.module.counter'`,
    ]);
    expect(checkUses(registry, node)).toContain(`use 'counter': unknown module 'org.dxos.module.counter'`);
  });

  test('a use alias binds module state; an unknown export is an inline error, not silence', async ({ expect }) => {
    const { BindingResolutionError } = await import('./model');
    const { render } = await import('./render');
    const renderer = makeStringRenderer();
    const modules = viewModules(withCounter, { [COUNTER]: { count: 5 } });

    const node = parse(
      '<container>' +
        '<use module="org.dxos.module.counter" as="counter" />' +
        '<display data-text="counter.doubled" />' +
        '</container>',
    );
    expect(render(node, { modules }, renderer)).toBe('container(display(10))');

    // Bypasses the registry's export table only at the binding site: constructed directly.
    const bad: import('./model').Node = {
      tag: 'container',
      children: [
        { tag: 'use', props: { module: COUNTER, as: 'counter' } },
        { tag: 'display', data: { text: { from: 'state', path: ['counter', 'missing'] } } },
      ],
    };
    expect(() => render(bad, { modules }, renderer)).toThrow(BindingResolutionError);
    // A declared alias whose module never loaded errors visibly as well.
    expect(() => render(node, { modules: {} }, renderer)).toThrow(/unknown module for alias 'counter'/);
  });

  test('let from= binds a module capability into the scope, read-only for template operations', async ({ expect }) => {
    const { render } = await import('./render');
    const renderer = makeStringRenderer();
    const modules = viewModules(withCounter, { [COUNTER]: { count: 7 } });
    const node = parse(
      '<container id="s">' +
        '<use module="org.dxos.module.counter" as="counter" />' +
        '<let name="value" from="counter.counter" />' +
        '<display data-text="value" />' +
        '</container>',
    );
    expect(render(node, { modules }, renderer)).toBe('container(display(7))');

    // The from-slot is not a writable template slot: a local operation cannot set it.
    const frame: SlotFrame = { path: ['s'], slots: [] };
    const local: Registry<never> = {
      ...withCounter,
      operations: {
        'org.dxos.operation.poke': {
          key: 'org.dxos.operation.poke',
          handler: ({ scope }) => scope.set({ value: 99 }),
        },
      },
    };
    expect(() => dispatch(local, {}, 'org.dxos.operation.poke', undefined, undefined, [frame])).toThrow(
      /no slot 'value' in scope/,
    );
  });
});

describe('mutual modules', () => {
  const FILTER = 'org.dxos.module.filter';
  const CONTACTS = 'org.dxos.module.contacts';

  // Two modules that reference each other: `contacts.visible` derives from `filter.text`
  // (reads the other's state), and `contacts.select` clears the filter by dispatching
  // `filter.clear` (writes the other's state ONLY through its owner's operation).
  const filter: ModuleDef<never> = {
    key: FILTER,
    slots: { text: { initial: '' } },
    state: {
      text: fromSlot('text'),
      // The reverse read: filter observes contacts' state.
      hasSelection: { derive: ({ read }) => read(CONTACTS, 'selection') !== undefined },
    },
    operations: {
      set: {
        key: 'org.dxos.operation.filter.set',
        handler: ({ scope, payload }) => scope.set({ text: String(payload ?? '') }),
      },
      clear: {
        key: 'org.dxos.operation.filter.clear',
        handler: ({ scope }) => scope.set({ text: '' }),
      },
      grab: {
        // Ownership violation: filter reaching into contacts' slots.
        key: 'org.dxos.operation.filter.grab',
        handler: ({ scope }) => scope.set({ selection: 'stolen' }),
      },
    },
    capabilities: {},
  };

  const contacts: ModuleDef<never> = {
    key: CONTACTS,
    slots: { selection: { initial: undefined } },
    state: {
      selection: fromSlot('selection'),
      visible: {
        derive: ({ inputs, read }) => {
          const text = String(read(FILTER, 'text') ?? '').toLowerCase();
          const items = Array.isArray(inputs.items) ? (inputs.items as string[]) : [];
          return text ? items.filter((item) => item.toLowerCase().includes(text)) : items;
        },
      },
    },
    operations: {
      select: {
        key: 'org.dxos.operation.contacts.select',
        handler: ({ scope, payload, invoke }) => {
          scope.set({ selection: payload });
          // Cross-module interaction IS dispatching the other module's operation.
          invoke('org.dxos.operation.filter.clear');
        },
      },
      poach: {
        // Ownership violation: contacts reaching into filter's slots.
        key: 'org.dxos.operation.contacts.poach',
        handler: ({ scope }) => scope.set({ text: 'hijack' }),
      },
    },
    capabilities: {
      selection: { machine: 'org.dxos.machine.selection', slot: 'selection' },
    },
  };

  const mutual: Registry<never> = { ...registry, modules: { [FILTER]: filter, [CONTACTS]: contacts } };
  const inputs = { [CONTACTS]: { items: ['Blue Yard', 'Backed', 'DXOS'] } };

  test('reads work both ways across the boundary', ({ expect }) => {
    const seeded = seedModules(mutual);
    const read = createModuleReader(mutual, () => seeded, inputs);
    // contacts derives from filter's state…
    expect(read(CONTACTS, 'visible')).toEqual(['Blue Yard', 'Backed', 'DXOS']);
    // …and filter derives from contacts' state.
    expect(read(FILTER, 'hasSelection')).toBe(false);

    const filtered = { ...seeded, [FILTER]: { text: 'ba' }, [CONTACTS]: { selection: 'org-1' } };
    const readFiltered = createModuleReader(mutual, () => filtered, inputs);
    expect(readFiltered(CONTACTS, 'visible')).toEqual(['Backed']);
    expect(readFiltered(FILTER, 'hasSelection')).toBe(true);
  });

  test('a write to foreign state goes through the owning module operation via invoke', ({ expect }) => {
    const before = { [FILTER]: { text: 'ba' }, [CONTACTS]: { selection: undefined } };
    const { ui, entries } = dispatch(
      mutual,
      before,
      'org.dxos.operation.contacts.select',
      'org-1',
      undefined,
      [],
      inputs,
    );
    // The selection landed in contacts' slice, the clear in filter's — each by its owner.
    expect(ui).toEqual({ [FILTER]: { text: '' }, [CONTACTS]: { selection: 'org-1' } });
    // Both writes are in the one log, attributed to their operations.
    expect(entries).toEqual([
      { operation: 'org.dxos.operation.contacts.select', payload: 'org-1' },
      { operation: 'org.dxos.operation.filter.clear', payload: undefined },
    ]);
  });

  test('write-ownership violations throw in both directions', ({ expect }) => {
    const seeded = seedModules(mutual);
    expect(() =>
      dispatch(mutual, seeded, 'org.dxos.operation.contacts.poach', undefined, undefined, [], inputs),
    ).toThrow(/module 'org.dxos.module.contacts' owns no slot 'text'/);
    expect(() => dispatch(mutual, seeded, 'org.dxos.operation.filter.grab', undefined, undefined, [], inputs)).toThrow(
      /module 'org.dxos.module.filter' owns no slot 'selection'/,
    );
  });

  test('a violating dispatch leaves no partial writes behind', ({ expect }) => {
    // dispatch is pure over `ui`: the thrown step's accumulated state is discarded with it.
    const before = seedModules(mutual);
    expect(() =>
      dispatch(mutual, before, 'org.dxos.operation.contacts.poach', undefined, undefined, [], inputs),
    ).toThrow(SystemError);
    expect(before).toEqual(seedModules(mutual));
  });

  test('a circular cross-module derivation is an error, not a hang', ({ expect }) => {
    const loopFilter: ModuleDef<never> = {
      ...filter,
      state: { ...filter.state, echo: { derive: ({ read }) => read(CONTACTS, 'mirror') } },
    };
    const loopContacts: ModuleDef<never> = {
      ...contacts,
      state: { ...contacts.state, mirror: { derive: ({ read }) => read(FILTER, 'echo') } },
    };
    const looped: Registry<never> = { ...registry, modules: { [FILTER]: loopFilter, [CONTACTS]: loopContacts } };
    const read = createModuleReader(looped, () => seedModules(looped), inputs);
    expect(() => read(FILTER, 'echo')).toThrow(/circular state derivation/);
  });
});

describe('vars', () => {
  const SIGNATURE =
    '<container>' +
    '<var name="organizations" type="org.dxos.type.Organization" many="true" />' +
    '<var name="selected" type="org.dxos.type.Organization" optional="true" />' +
    '<collection data-items="organizations" item-id="id" item-label="name" />' +
    '</container>';

  test('the signature is readable off the root', ({ expect }) => {
    const decls = varDecls(parse(SIGNATURE));
    expect(decls).toEqual([
      { name: 'organizations', type: 'org.dxos.type.Organization', many: true },
      { name: 'selected', type: 'org.dxos.type.Organization', optional: true },
    ]);
  });

  test('a declared var resolves from the host-supplied values', async ({ expect }) => {
    const { render } = await import('./render');
    const renderer = makeStringRenderer();
    const node = parse(
      '<container>' +
        '<var name="title" type="org.dxos.type.Text" />' +
        '<display data-text="title" />' +
        '</container>',
    );
    expect(render(node, { vars: { title: 'MOSAIC' } }, renderer)).toBe('container(display(MOSAIC))');
  });

  test('an undeclared host value never resolves — the signature closes the namespace', async ({ expect }) => {
    const { BindingResolutionError } = await import('./model');
    const { render } = await import('./render');
    const renderer = makeStringRenderer();
    // Constructed directly: the parser rejects the undeclared binding statically.
    const node: import('./model').Node = {
      tag: 'container',
      children: [
        { tag: 'var', props: { name: 'title', type: 'org.dxos.type.Text' } },
        { tag: 'display', data: { text: { from: 'state', path: ['extra'] } } },
      ],
    };
    expect(() => render(node, { vars: { title: 'x', extra: 'leak' } }, renderer)).toThrow(BindingResolutionError);
  });

  test('checkVars reports the mount errors the design table names', ({ expect }) => {
    const schemas = { 'org.dxos.type.Organization': 'org-schema' };
    const decls = varDecls(parse(SIGNATURE));

    // Missing required input.
    expect(checkVars(schemas, decls, {})).toEqual([`var 'organizations' is required`]);
    // Optional input may be absent.
    expect(checkVars(schemas, decls, { organizations: [] })).toEqual([]);
    // `many` demands an array.
    expect(checkVars(schemas, decls, { organizations: 'not-a-list' })).toEqual([
      `var 'organizations' expects an array`,
    ]);
    // Unknown type key is a registration error.
    expect(checkVars({}, decls, { organizations: [] })).toEqual([
      `var 'organizations': unknown type 'org.dxos.type.Organization'`,
      `var 'selected': unknown type 'org.dxos.type.Organization'`,
    ]);
    // The host's schema decode runs per value (per element under `many`).
    const isValid = (schema: string, value: unknown) => typeof value === 'object' && value !== null;
    expect(checkVars(schemas, decls, { organizations: [{}, 'bad'] }, isValid)).toEqual([
      `var 'organizations': an element does not satisfy 'org.dxos.type.Organization'`,
    ]);
    expect(checkVars(schemas, decls, { organizations: [{}], selected: {} }, isValid)).toEqual([]);
  });
});

describe('switch/match', () => {
  test('renders only the match equal to the resolved on binding', async ({ expect }) => {
    const { render } = await import('./render');
    const renderer = makeStringRenderer();
    const node = parse(
      '<container id="view">' +
        '<let name="mode" initial="list" />' +
        '<switch on="mode">' +
        '<match value="list"><display label="the-list" /></match>' +
        '<match value="detail"><display label="the-detail" /></match>' +
        '</switch>' +
        '</container>',
    );

    expect(render(node, { ui: { view: { mode: 'list' } } }, renderer)).toBe('container(switch(display(the-list)))');
    expect(render(node, { ui: { view: { mode: 'detail' } } }, renderer)).toBe('container(switch(display(the-detail)))');
    expect(render(node, { ui: {} }, renderer)).toBe('container(switch())');
  });
});

describe('show/fallback', () => {
  test('present renders the children, absent renders the fallback children', async ({ expect }) => {
    const { render } = await import('./render');
    const renderer = makeStringRenderer();
    const node = parse(
      '<container id="contacts">' +
        '<let name="selected" machine="org.dxos.machine.selection" />' +
        '<show when="selected">' +
        '<display label="the-detail" />' +
        '<fallback><display label="nothing" /></fallback>' +
        '</show>' +
        '</container>',
    );

    expect(render(node, { ui: { contacts: { selected: { id: 'org-1' } } } }, renderer)).toBe(
      'container(show(display(the-detail)))',
    );
    expect(render(node, { ui: { contacts: { selected: false } } }, renderer)).toBe('container(show(display(nothing)))');
    expect(render(node, { ui: {} }, renderer)).toBe('container(show(display(nothing)))');
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

    expect(render(node, { ui: { contacts: { selection: 'org-1' } } }, renderer)).toBe('container(display(org-1))');
  });

  test('an undeclared name at render surfaces inline through onError, or throws without one', async ({ expect }) => {
    const { BindingResolutionError } = await import('./model');
    const { render } = await import('./render');
    const renderer = makeStringRenderer();
    // Constructed directly — the parser would have rejected the undeclared binding already.
    const node: import('./model').Node = { tag: 'display', data: { text: { from: 'state', path: ['title'] } } };

    expect(() => render(node, {}, renderer)).toThrow(BindingResolutionError);
    expect(render(node, {}, renderer, { onError: (error) => `error(${error.message})` })).toBe(
      "error(unresolved name 'title' (binding 'title'))",
    );
  });
});
