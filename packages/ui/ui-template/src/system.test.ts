//
// Copyright 2026 DXOS.org
//

import { VanillaMachine } from '@zag-js/vanilla';
import { describe, test } from 'vitest';

import { parse } from './parser';
import {
  type LogEntry,
  type ModuleDef,
  type Registry,
  type SlotFrame,
  SystemError,
  checkUses,
  checkVars,
  createModuleReader,
  dispatch,
  fromSlot,
  mountCapabilities,
  seedModules,
  seedUi,
  unmountCapabilities,
  varDecls,
  viewModules,
} from './system';
import { type MultiSelectApi, type MultiSelectSchema, connect, multiSelectMachine } from './testing';

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

const TASKS_FRAME: SlotFrame = { path: ['tasks'], slots: ['selection'] };

describe('seedUi', () => {
  test('a let under a scoped element is seeded at ui.<id>.<name>', ({ expect }) => {
    const node = parse(
      '<container id="tasks">' +
        '<let name="selection" machine="org.dxos.machine.selection" />' +
        '<let name="draft" machine="org.dxos.machine.flag" />' +
        '</container>',
    );
    expect(seedUi(registry, node)).toEqual({ tasks: { selection: undefined, draft: false } });
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
        '<use module="org.dxos.module.tasks" as="tasks" />' +
        '<let name="selection" from="tasks.selection" />' +
        '<let name="draft" initial="false" />' +
        '</container>',
    );
    expect(seedUi(registry, node)).toEqual({ s: { draft: false } });
  });

  test('an unknown machine is an error, not an empty slot', ({ expect }) => {
    const node = parse('<container id="tasks"><let name="x" machine="org.dxos.machine.missing" /></container>');
    expect(() => seedUi(registry, node)).toThrow(SystemError);
  });
});

describe('dispatch', () => {
  test('scope.set writes the nested slot and logs the operation', ({ expect }) => {
    const { ui, entries } = dispatch(registry, {}, 'org.dxos.operation.select', 'task-1', undefined, [TASKS_FRAME]);
    expect(ui).toEqual({ tasks: { selection: 'task-1' } });
    expect(entries).toEqual([{ operation: 'org.dxos.operation.select', payload: 'task-1' }]);
  });

  test('scope.get resolves through the innermost frame declaring the name', ({ expect }) => {
    const before = { app: { selection: 'outer', tasks: { selection: 'inner' } } };
    const frames: SlotFrame[] = [
      { path: ['app'], slots: ['selection'] },
      { path: ['app', 'tasks'], slots: ['selection'] },
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
    expect(() => dispatch(registry, {}, 'org.dxos.operation.reset', undefined, undefined, [TASKS_FRAME])).toThrow(
      SystemError,
    );
  });

  test('a handler returning nothing but calling scope.set changes ui', ({ expect }) => {
    const before = { tasks: { selection: undefined } };
    const { ui } = dispatch(registry, before, 'org.dxos.operation.select', 'task-2', undefined, [TASKS_FRAME]);
    expect(ui).not.toBe(before);
    expect(ui).toEqual({ tasks: { selection: 'task-2' } });
  });

  test('a handler touching nothing leaves ui unchanged', ({ expect }) => {
    const before = { tasks: { selection: 'task-1' } };
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
  const TASKS = 'org.dxos.module.tasks';

  // Two modules that reference each other: `tasks.visible` derives from `filter.text`
  // (reads the other's state), and `tasks.select` clears the filter by dispatching
  // `filter.clear` (writes the other's state ONLY through its owner's operation).
  const filter: ModuleDef<never> = {
    key: FILTER,
    slots: { text: { initial: '' } },
    state: {
      text: fromSlot('text'),
      // The reverse read: filter observes tasks' state.
      hasSelection: { derive: ({ read }) => read(TASKS, 'selectionId') !== undefined },
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
        // Ownership violation: filter reaching into tasks' slots.
        key: 'org.dxos.operation.filter.grab',
        handler: ({ scope }) => scope.set({ selections: ['stolen'] }),
      },
    },
    capabilities: {},
  };

  const tasks: ModuleDef<never> = {
    key: TASKS,
    slots: { selections: { initial: [] } },
    state: {
      selections: fromSlot('selections'),
      selectionId: {
        derive: ({ slots }) => (Array.isArray(slots.selections) ? slots.selections[0] : undefined),
      },
      visible: {
        derive: ({ inputs, read }) => {
          const text = String(read(FILTER, 'text') ?? '').toLowerCase();
          const items = Array.isArray(inputs.items) ? inputs.items.map(String) : [];
          return text ? items.filter((item) => item.toLowerCase().includes(text)) : items;
        },
      },
    },
    operations: {
      select: {
        key: 'org.dxos.operation.tasks.select',
        handler: ({ scope, payload, invoke }) => {
          scope.set({ selections: typeof payload === 'string' ? [payload] : [] });
          // Cross-module interaction IS dispatching the other module's operation.
          invoke('org.dxos.operation.filter.clear');
        },
      },
      poach: {
        // Ownership violation: tasks reaching into filter's slots.
        key: 'org.dxos.operation.tasks.poach',
        handler: ({ scope }) => scope.set({ text: 'hijack' }),
      },
    },
    capabilities: {},
  };

  const mutual: Registry<never> = { ...registry, modules: { [FILTER]: filter, [TASKS]: tasks } };
  const inputs = { [TASKS]: { items: ['Write docs', 'Fix build', 'Ship release'] } };

  test('reads work both ways across the boundary', ({ expect }) => {
    const seeded = seedModules(mutual);
    const read = createModuleReader(mutual, () => seeded, inputs);
    // tasks derives from filter's state…
    expect(read(TASKS, 'visible')).toEqual(['Write docs', 'Fix build', 'Ship release']);
    // …and filter derives from tasks' state.
    expect(read(FILTER, 'hasSelection')).toBe(false);

    const filtered = { ...seeded, [FILTER]: { text: 'fix' }, [TASKS]: { selections: ['task-1'] } };
    const readFiltered = createModuleReader(mutual, () => filtered, inputs);
    expect(readFiltered(TASKS, 'visible')).toEqual(['Fix build']);
    expect(readFiltered(FILTER, 'hasSelection')).toBe(true);
  });

  test('a write to foreign state goes through the owning module operation via invoke', ({ expect }) => {
    const before = { [FILTER]: { text: 'fix' }, [TASKS]: { selections: [] } };
    const { ui, entries } = dispatch(
      mutual,
      before,
      'org.dxos.operation.tasks.select',
      'task-1',
      undefined,
      [],
      inputs,
    );
    // The selection landed in tasks' slice, the clear in filter's — each by its owner.
    expect(ui).toEqual({ [FILTER]: { text: '' }, [TASKS]: { selections: ['task-1'] } });
    // Both writes are in the one log, attributed to their operations.
    expect(entries).toEqual([
      { operation: 'org.dxos.operation.tasks.select', payload: 'task-1' },
      { operation: 'org.dxos.operation.filter.clear', payload: undefined },
    ]);
  });

  test('write-ownership violations throw in both directions', ({ expect }) => {
    const seeded = seedModules(mutual);
    expect(() => dispatch(mutual, seeded, 'org.dxos.operation.tasks.poach', undefined, undefined, [], inputs)).toThrow(
      /module 'org.dxos.module.tasks' owns no slot 'text'/,
    );
    expect(() => dispatch(mutual, seeded, 'org.dxos.operation.filter.grab', undefined, undefined, [], inputs)).toThrow(
      /module 'org.dxos.module.filter' owns no slot 'selections'/,
    );
  });

  test('a violating dispatch leaves no partial writes behind', ({ expect }) => {
    // dispatch is pure over `ui`: the thrown step's accumulated state is discarded with it.
    const before = seedModules(mutual);
    expect(() => dispatch(mutual, before, 'org.dxos.operation.tasks.poach', undefined, undefined, [], inputs)).toThrow(
      SystemError,
    );
    expect(before).toEqual(seedModules(mutual));
  });

  test('a circular cross-module derivation is an error, not a hang', ({ expect }) => {
    const loopFilter: ModuleDef<never> = {
      ...filter,
      state: { ...filter.state, echo: { derive: ({ read }) => read(TASKS, 'mirror') } },
    };
    const loopTasks: ModuleDef<never> = {
      ...tasks,
      state: { ...tasks.state, mirror: { derive: ({ read }) => read(FILTER, 'echo') } },
    };
    const looped: Registry<never> = { ...registry, modules: { [FILTER]: loopFilter, [TASKS]: loopTasks } };
    const read = createModuleReader(looped, () => seedModules(looped), inputs);
    expect(() => read(FILTER, 'echo')).toThrow(/circular state derivation/);
  });
});

describe('vars', () => {
  const SIGNATURE =
    '<container>' +
    '<var name="tasks" type="org.dxos.type.Task" many="true" />' +
    '<var name="selected" type="org.dxos.type.Task" optional="true" />' +
    '<collection data-items="tasks" item-id="id" item-label="title" />' +
    '</container>';

  test('the signature is readable off the root', ({ expect }) => {
    const decls = varDecls(parse(SIGNATURE));
    expect(decls).toEqual([
      { name: 'tasks', type: 'org.dxos.type.Task', many: true },
      { name: 'selected', type: 'org.dxos.type.Task', optional: true },
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
    const schemas = { 'org.dxos.type.Task': 'task-schema' };
    const decls = varDecls(parse(SIGNATURE));

    // Missing required input.
    expect(checkVars(schemas, decls, {})).toEqual([`var 'tasks' is required`]);
    // Optional input may be absent.
    expect(checkVars(schemas, decls, { tasks: [] })).toEqual([]);
    // `many` demands an array.
    expect(checkVars(schemas, decls, { tasks: 'not-a-list' })).toEqual([`var 'tasks' expects an array`]);
    // Unknown type key is a registration error.
    expect(checkVars({}, decls, { tasks: [] })).toEqual([
      `var 'tasks': unknown type 'org.dxos.type.Task'`,
      `var 'selected': unknown type 'org.dxos.type.Task'`,
    ]);
    // The host's schema decode runs per value (per element under `many`).
    const isValid = (schema: string, value: unknown) => typeof value === 'object' && value !== null;
    expect(checkVars(schemas, decls, { tasks: [{}, 'bad'] }, isValid)).toEqual([
      `var 'tasks': an element does not satisfy 'org.dxos.type.Task'`,
    ]);
    expect(checkVars(schemas, decls, { tasks: [{}], selected: {} }, isValid)).toEqual([]);
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
      '<container id="tasks">' +
        '<let name="selected" machine="org.dxos.machine.selection" />' +
        '<show when="selected">' +
        '<display label="the-detail" />' +
        '<fallback><display label="nothing" /></fallback>' +
        '</show>' +
        '</container>',
    );

    expect(render(node, { ui: { tasks: { selected: { id: 'task-1' } } } }, renderer)).toBe(
      'container(show(display(the-detail)))',
    );
    expect(render(node, { ui: { tasks: { selected: false } } }, renderer)).toBe('container(show(display(nothing)))');
    expect(render(node, { ui: {} }, renderer)).toBe('container(show(display(nothing)))');
  });
});

describe('lexical resolution', () => {
  test('a slot name resolves through the enclosing scope frame to published state', async ({ expect }) => {
    const { render } = await import('./render');
    const renderer = makeStringRenderer();
    const node = parse(
      '<container id="tasks">' +
        '<let name="selection" machine="org.dxos.machine.selection" />' +
        '<display data-text="selection" />' +
        '</container>',
    );

    expect(render(node, { ui: { tasks: { selection: 'task-1' } } }, renderer)).toBe('container(display(task-1))');
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

describe('capability sync (zag)', () => {
  const TASKS = 'org.dxos.module.tasks';
  const SELECT = 'org.dxos.operation.tasks.select';
  const SELECT_MANY = 'org.dxos.operation.tasks.select-many';
  const MULTI_SELECT_MACHINE = 'org.dxos.machine.multi-select';

  const asIds = (value: unknown): string[] => (Array.isArray(value) ? value.map(String) : []);

  /** Zag defers `send` to a microtask; one turn drains every event queued before it. */
  const settle = () => new Promise<void>((resolve) => queueMicrotask(resolve));

  /**
   * The headless host loop: mount the module's capability instances against a dispatch that
   * folds each operation's result back into `ui` and appends its entries to the log — the same
   * wiring `useSystem` does, minus React.
   */
  const createHost = () => {
    let api: MultiSelectApi | undefined;
    const tasks: ModuleDef<never> = {
      key: TASKS,
      slots: { selections: { initial: [] } },
      state: {
        selections: fromSlot('selections'),
        selectionCount: { derive: ({ slots }) => asIds(slots.selections).length },
      },
      operations: {
        // The constrained single-select writer of the same slot: one id or, with no payload, none.
        select: {
          key: SELECT,
          handler: ({ scope, payload }) => scope.set({ selections: typeof payload === 'string' ? [payload] : [] }),
        },
        selectMany: {
          key: SELECT_MANY,
          handler: ({ scope, payload }) => {
            const ids = payload !== null && typeof payload === 'object' && 'ids' in payload ? asIds(payload.ids) : [];
            scope.set({ selections: ids });
          },
        },
      },
      capabilities: {
        multiSelect: {
          machine: MULTI_SELECT_MACHINE,
          slot: 'selections',
          create: ({ invoke }) => {
            const machine = new VanillaMachine<MultiSelectSchema>(multiSelectMachine, {
              // The instance's ONLY write path: every committed transition dispatches the
              // owning module's operation, whose handler snapshots into the slot.
              onChange: ({ selection }) => invoke(SELECT_MANY, { ids: [...selection] }),
            });
            machine.start();
            api = connect(machine.service);
            return { api, dispose: () => machine.stop() };
          },
        },
      },
    };
    const other: ModuleDef<never> = {
      key: 'org.dxos.module.other',
      slots: {},
      state: {},
      operations: {
        poke: {
          key: 'org.dxos.operation.other.poke',
          handler: ({ scope }) => scope.set({ selections: ['x'] }),
        },
      },
      capabilities: {},
    };
    const host: Registry<never> = {
      ...registry,
      machines: { ...registry.machines, [MULTI_SELECT_MACHINE]: { key: MULTI_SELECT_MACHINE, initial: [] } },
      modules: { [TASKS]: tasks, 'org.dxos.module.other': other },
    };
    let ui = seedModules(host);
    const log: LogEntry[] = [];
    const send = (operation: string, payload?: unknown) => {
      const result = dispatch(host, ui, operation, payload);
      ui = result.ui;
      log.push(...result.entries);
    };
    const instances = mountCapabilities(host, send);
    if (!api) {
      throw new Error('capability instance did not mount');
    }
    return { host, instances, api, log, send, ui: () => ui };
  };

  test('a machine event reaches published state as onChange -> operation -> slot, and is logged', async ({
    expect,
  }) => {
    const { instances, api, log, ui } = createHost();
    expect(ui()[TASKS]).toEqual({ selections: [] });

    api.select('a');
    await settle();
    expect(ui()[TASKS]).toEqual({ selections: ['a'] });
    expect(log).toEqual([{ operation: SELECT_MANY, payload: { ids: ['a'] } }]);
    unmountCapabilities(instances);
  });

  test('multi -> single transitions log every snapshot, in order', async ({ expect }) => {
    const { host, instances, api, log, ui } = createHost();
    api.select('a');
    api.select('b', true);
    api.select('c', true);
    api.select('d');
    await settle();

    expect(log.map((entry) => entry.operation)).toEqual([SELECT_MANY, SELECT_MANY, SELECT_MANY, SELECT_MANY]);
    expect(log.map((entry) => entry.payload)).toEqual([
      { ids: ['a'] },
      { ids: ['a', 'b'] },
      { ids: ['a', 'b', 'c'] },
      { ids: ['d'] },
    ]);
    expect(ui()[TASKS]).toEqual({ selections: ['d'] });

    // The module view carries the snapshot (capabilities column) and the live api (apis column).
    const views = viewModules(host, ui(), {}, instances);
    expect(views[TASKS].capabilities.multiSelect).toEqual(['d']);
    expect(views[TASKS].apis?.multiSelect).toBe(api);
    expect(views[TASKS].state.selectionCount).toBe(1);
    unmountCapabilities(instances);
  });

  test('single-select then shift-click: both writers land in the one slot, one history', async ({ expect }) => {
    const { instances, api, log, send, ui } = createHost();

    // The constrained single writer: a direct dispatch, no machine involved.
    send(SELECT, 'a');
    expect(ui()[TASKS]).toEqual({ selections: ['a'] });

    // The multi writer: a shift-click transition snapshots the machine's own committed
    // selection over the same slot (the machine holds its state, not the slot's).
    api.select('b', true);
    await settle();
    expect(ui()[TASKS]).toEqual({ selections: ['b'] });

    // One history carries both writers, in order.
    expect(log).toEqual([
      { operation: SELECT, payload: 'a' },
      { operation: SELECT_MANY, payload: { ids: ['b'] } },
    ]);

    // The no-payload dispatch is the Esc-deselect path: the same slot, emptied.
    send(SELECT);
    expect(ui()[TASKS]).toEqual({ selections: [] });
    unmountCapabilities(instances);
  });

  test('write ownership holds against the machine-backed slot', ({ expect }) => {
    const { host, instances, ui } = createHost();
    expect(() => dispatch(host, ui(), 'org.dxos.operation.other.poke')).toThrow(/owns no slot 'selections'/);
    unmountCapabilities(instances);
  });

  test('unmount disposes the instance: no operations after teardown', async ({ expect }) => {
    const { instances, api, log } = createHost();
    unmountCapabilities(instances);
    api.select('a');
    await settle();
    expect(log).toEqual([]);
  });
});
