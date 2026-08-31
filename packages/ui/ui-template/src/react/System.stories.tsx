//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { VanillaMachine } from '@zag-js/vanilla';
import * as Schema from 'effect/Schema';
import React, { useMemo, useState } from 'react';

import { type Database, Filter, Obj } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { useQuery } from '@dxos/echo-react';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Task } from '@dxos/types';
import { json } from '@dxos/ui-editor';
import { trim } from '@dxos/util';

import { templateLanguage } from '../codemirror';
import { type Node } from '../model';
import { parse } from '../parser';
import {
  type ModuleDef,
  type ModuleInputs,
  type Registry,
  type UiState,
  checkUses,
  checkVars,
  fromSlot,
  varDecls,
  viewModules,
} from '../system';
import { type MultiSelectSchema, connect, multiSelectMachine } from '../testing';
import { AttentionProvider } from './attention';
import { Template, createReactRenderer } from './renderer';
import { Editor, OperationLog, Workbench } from './testing';
import { useSystem } from './useSystem';

//
// SPIKE. The system stories: one DefaultStory, per-story layout. Everything below a story's
// `source` runs through the same loop — parse → seed slots (template lets + module slots) →
// materialize module views from (published state × live ECHO query inputs) → render →
// operations → new state. Nothing is ambient: every name a template binds is a `let`, a root
// `var`, or a `use` alias into a module's typed export table.
//

type Db = Database.Database;

/**
 * Story database: `EchoTestBuilder` rather than the full client harness — no HALO, no space
 * pipeline, milliseconds to open. One per page load; stories share it, which also demonstrates
 * that the system tolerates pre-existing data.
 */
const testDb = (() => {
  let promise: Promise<Db> | undefined;
  return () => {
    promise ??= (async () => {
      const builder = new EchoTestBuilder();
      await builder.open();
      const { db } = await builder.createDatabase({ types: [Task.Task] });
      [
        'Write release notes',
        'Fix login redirect',
        'Update onboarding docs',
        'Review open pull requests',
        'Ship beta build',
        'Triage support inbox',
      ].forEach((title, index) => {
        db.add(Task.make({ title, status: index % 2 === 0 ? 'todo' : 'started' }));
      });
      return db;
    })();
    return promise;
  };
})();

const useTestDb = (): Db | undefined => {
  const [db, setDb] = useState<Db>();
  useMemo(() => {
    void testDb().then(setDb);
  }, []);
  return db;
};

//
// Registry. Everything a template references, by URI. Operations are the only writer: they step
// published state and may mutate the database; the query feeds mutations back as new inputs.
//

const TASK = 'org.dxos.type.Task';
const TEXT = 'org.dxos.type.Text';

const TASKS_MODULE = 'org.dxos.module.tasks';
const PICKER_MODULE = 'org.dxos.module.picker';
const FILTER_MODULE = 'org.dxos.module.filter';

/** The status subset the form edits — the stored type also carries terminal states. */
const TaskStatus = Schema.Literals(['todo', 'started', 'done']);

/**
 * The FORM schema: the editable projection, not the stored type. `Type.getSchema(Task)`
 * carries the ECHO `id` as a required field, which a draft cannot satisfy — a live reminder that
 * forms want a View (ONTOLOGY R-5), and the registry should hold both.
 */
const TaskForm = Schema.Struct({
  title: Schema.String.annotate({ title: 'Title' }),
  description: Schema.String.pipe(Schema.annotate({ title: 'Description' }), Schema.optional),
  status: TaskStatus.pipe(Schema.annotate({ title: 'Status' }), Schema.optional),
});

type TaskFormValues = Schema.Schema.Type<typeof TaskForm>;

const toFormValues = (task: Task.Task): TaskFormValues => ({
  title: task.title,
  description: task.description,
  status: Schema.is(TaskStatus)(task.status) ? task.status : undefined,
});

/** The tasks a module received as input (the live query, wired by the host). */
const inputTasks = (inputs: Readonly<Record<string, unknown>>): readonly Task.Task[] =>
  Array.isArray(inputs.tasks) ? inputs.tasks : [];

/** A multi-selection as ids — the `selections` slot value or a `select-many` payload's `ids`. */
const asIds = (value: unknown): string[] => (Array.isArray(value) ? value.map(String) : []);

/**
 * The tasks module: what `deriveContext` used to smuggle in ambiently is now the module's
 * typed export table — the module that owns the inputs (selections, draft, the query) exports the
 * derivations (`selected`), and its operations are the only writers of its slots.
 */
const TasksModule: ModuleDef<Db> = {
  key: TASKS_MODULE,
  description: 'Tasks: query, shared selection, and the editing draft.',
  slots: {
    selections: { initial: [] },
    draft: { initial: false },
  },
  state: {
    items: { derive: ({ inputs }) => inputTasks(inputs) },
    // Derived from selections × draft × items — typed, owned here, never ambient.
    selected: {
      derive: ({ slots, inputs }) => {
        if (slots.draft === true) {
          return {};
        }
        const ids = asIds(slots.selections);
        const selected = ids.length === 1 ? inputTasks(inputs).find((task) => task.id === ids[0]) : undefined;
        return selected ? toFormValues(selected) : undefined;
      },
    },
    // The singular listbox's controlled value: a string only while exactly one id is selected.
    selectionId: {
      derive: ({ slots }) => {
        const ids = asIds(slots.selections);
        return ids.length === 1 ? ids[0] : undefined;
      },
    },
    // The ONE selection slot's snapshot and its structural derivations — `show` branches on
    // these, so "exactly one" lives here, never as a template expression.
    selections: fromSlot('selections'),
    selectedOne: {
      derive: ({ slots, inputs }) => {
        const ids = asIds(slots.selections);
        if (ids.length !== 1) {
          return undefined;
        }
        const selected = inputTasks(inputs).find((task) => task.id === ids[0]);
        return selected ? toFormValues(selected) : undefined;
      },
    },
    manySelected: {
      derive: ({ slots }) => (asIds(slots.selections).length > 1 ? asIds(slots.selections).length : undefined),
    },
    selectionLabel: {
      derive: ({ slots }) => `${asIds(slots.selections).length} selected`,
    },
    // Selection cardinality as a value, so templates branch with a flat switch/match rather
    // than nested binary shows.
    selectionState: {
      derive: ({ slots }) => {
        const count = asIds(slots.selections).length;
        return count === 0 ? 'none' : count === 1 ? 'one' : 'many';
      },
    },
  },
  operations: {
    select: {
      key: 'org.dxos.operation.tasks.select',
      description: 'Select a row in the master list — the constrained single writer of the selections slot.',
      // No payload (Esc-deselect) clears the slot; a string selects exactly that id.
      handler: ({ scope, payload }) =>
        scope.set({ selections: typeof payload === 'string' ? [payload] : [], draft: false }),
    },
    selectMany: {
      key: 'org.dxos.operation.tasks.select-many',
      description: 'Snapshot the multi-select capability instance into the selections slot.',
      handler: ({ scope, payload }) => {
        const ids = payload !== null && typeof payload === 'object' && 'ids' in payload ? asIds(payload.ids) : [];
        scope.set({ selections: ids, draft: false });
      },
    },
    add: {
      key: 'org.dxos.operation.tasks.add',
      description: 'Start a draft; the form edits a temporary object until save.',
      handler: ({ scope }) => scope.set({ selections: [], draft: true }),
    },
    save: {
      key: 'org.dxos.operation.tasks.save',
      description: 'Commit the form draft: update the selected object, or add the draft to the database.',
      handler: ({ scope, payload, db }) => {
        const values = (payload ?? {}) as TaskFormValues;
        if (scope.get('draft') === true) {
          db?.add(Task.make(values));
          scope.set({ draft: false });
          return;
        }
        // Exactly one selected id is the form's subject — single and multi templates alike.
        const ids = asIds(scope.get('selections'));
        const id = ids.length === 1 ? ids[0] : undefined;
        const object = id ? db?.getObjectById<Task.Task>(id) : undefined;
        if (object) {
          // Field by field, never Object.assign: the form's values may carry keys the schema
          // projection does not own (the ECHO id is readonly).
          Obj.update(object, (object) => {
            object.title = values.title;
            object.description = values.description;
            object.status = values.status;
          });
        }
      },
    },
    cancel: {
      key: 'org.dxos.operation.tasks.cancel',
      description: 'Discard the draft.',
      handler: ({ scope }) => scope.set({ draft: false }),
    },
    done: {
      key: 'org.dxos.operation.tasks.done',
      description: 'Toolbar action over the current selection: mark every selected task done.',
      handler: ({ scope, db }) => {
        for (const id of asIds(scope.get('selections'))) {
          const object = db?.getObjectById<Task.Task>(id);
          if (object) {
            Obj.update(object, (object) => {
              object.status = 'done';
            });
          }
        }
      },
    },
  },
  capabilities: {
    // The zag machine as a live capability: one shared instance, mounted with the system. Its
    // only write path is onChange → select-many → the selections slot, so every transition is a
    // logged operation and the published snapshot is the state binders read — the machine stays
    // an implementation detail behind the slot.
    multiSelect: {
      machine: 'org.dxos.machine.multi-select',
      slot: 'selections',
      create: ({ invoke }) => {
        const machine = new VanillaMachine<MultiSelectSchema>(multiSelectMachine, {
          onChange: ({ selection }) => invoke('org.dxos.operation.tasks.select-many', { ids: [...selection] }),
        });
        // Started via `start`, guarded so strict mode's dispose/remount cycle restarts it exactly once.
        let running = false;
        const start = () => {
          if (!running) {
            machine.start();
            running = true;
          }
        };
        start();
        // Senders only: connect's snapshot reads go stale by design — binders read the slot.
        return {
          api: connect(machine.service),
          start,
          dispose: () => {
            machine.stop();
            running = false;
          },
        };
      },
    },
  },
};

/** The picker module: combobox filter text, committed value, and their derivations. */
const PickerModule: ModuleDef<Db> = {
  key: PICKER_MODULE,
  slots: {
    filter: { initial: '' },
    value: { initial: undefined },
  },
  state: {
    filter: fromSlot('filter'),
    filtered: {
      derive: ({ slots, inputs }) => {
        const text = String(slots.filter ?? '').toLowerCase();
        const tasks = inputTasks(inputs);
        return text ? tasks.filter((task) => task.title.toLowerCase().includes(text)) : tasks;
      },
    },
    selected: {
      derive: ({ slots, inputs }) => {
        const selected = inputTasks(inputs).find((task) => task.id === slots.value);
        return selected ? toFormValues(selected) : undefined;
      },
    },
    pickerLabel: {
      derive: ({ slots, inputs }) => inputTasks(inputs).find((task) => task.id === slots.value)?.title ?? '',
    },
  },
  operations: {
    input: {
      key: 'org.dxos.operation.picker.input',
      handler: ({ scope, payload }) => scope.set({ filter: String(payload ?? '') }),
    },
    select: {
      key: 'org.dxos.operation.picker.select',
      handler: ({ scope, payload }) => scope.set({ value: payload, filter: '' }),
    },
  },
  capabilities: {},
};

/** The filter module: the `useState` exemplar promoted to a module that owns its derivation. */
const FilterModule: ModuleDef<Db> = {
  key: FILTER_MODULE,
  slots: {
    text: { initial: '' },
  },
  state: {
    text: fromSlot('text'),
    filtered: {
      derive: ({ slots, inputs }) => {
        const text = String(slots.text ?? '').toLowerCase();
        const tasks = inputTasks(inputs);
        return text ? tasks.filter((task) => task.title.toLowerCase().includes(text)) : tasks;
      },
    },
  },
  operations: {
    input: {
      key: 'org.dxos.operation.filter.input',
      handler: ({ scope, payload }) => scope.set({ text: String(payload ?? '') }),
    },
  },
  capabilities: {},
};

const registry: Registry<Db, Schema.Codec<unknown, unknown>> = {
  schemas: {
    [TASK]: TaskForm,
    [TEXT]: Schema.String,
  },

  // Machines back capability instances (and rung-2 lets); rung-1 lets need none.
  machines: {
    'org.dxos.machine.selection': {
      key: 'org.dxos.machine.selection',
      initial: undefined,
    },
    'org.dxos.machine.multi-select': {
      key: 'org.dxos.machine.multi-select',
      initial: [],
    },
  },

  // The flat table holds only template-local operations — an anonymous template's writers.
  // Everything module-owned lives in the module's own operations column below.
  operations: {
    'org.dxos.operation.view.set': {
      key: 'org.dxos.operation.view.set',
      description: 'Tabs write which branch of the switch exists.',
      handler: ({ scope, payload }) => scope.set({ view: String(payload ?? 'list') }),
    },
  },

  modules: {
    [TASKS_MODULE]: TasksModule,
    [PICKER_MODULE]: PickerModule,
    [FILTER_MODULE]: FilterModule,
  },
};

//
// Layouts.
//

const LIST = trim`
  <container>
    <var name="title" type="org.dxos.type.Text" />
    <use module="org.dxos.module.tasks" as="tasks" />
    <display variant="title" data-text="title" />
    <collection data-items="tasks.items" item-id="id" item-label="title" />
  </container>
`;

const FORM = trim`
  <container>
    <var name="title" type="org.dxos.type.Text" />
    <use module="org.dxos.module.tasks" as="tasks" />
    <display variant="title" data-text="title" />
    <command>
      <control as="button" label="Add" on-activate="org.dxos.operation.tasks.add" />
    </command>
    <show when="tasks.selected">
      <form schema="org.dxos.type.Task" data-values="tasks.selected"
            on-save="org.dxos.operation.tasks.save"
            on-cancel="org.dxos.operation.tasks.cancel" />
      <fallback>
        <display label="Nothing selected — Add starts a draft." />
      </fallback>
    </show>
  </container>
`;

const MASTER_DETAIL = trim`
  <container id="example">
    <use module="org.dxos.module.tasks" as="tasks" />
    <layout rows="1fr 1fr" resizable="true">
      <collection data-items="tasks.items" item-id="id" item-label="title"
                  data-selection="tasks.selectionId"
                  on-select="org.dxos.operation.tasks.select" />
      <show when="tasks.selected">
        <form schema="org.dxos.type.Task" data-values="tasks.selected"
              on-save="org.dxos.operation.tasks.save"
              on-cancel="org.dxos.operation.tasks.cancel" />
        <fallback>
          <display label="Nothing selected." />
        </fallback>
      </show>
    </layout>
  </container>
`;

const MASTER_DETAIL_TOOLBAR = trim`
  <container id="example">
    <use module="org.dxos.module.tasks" as="tasks" />
    <command>
      <control as="button" label="Add" on-activate="org.dxos.operation.tasks.add" />
      <control as="button" label="Done" enabled="tasks.selected"
               on-activate="org.dxos.operation.tasks.done" />
    </command>
    <layout rows="1fr 1fr" resizable="true">
      <collection data-items="tasks.items" item-id="id" item-label="title"
                  data-selection="tasks.selectionId"
                  on-select="org.dxos.operation.tasks.select" />
      <show when="tasks.selected">
        <form schema="org.dxos.type.Task" data-values="tasks.selected"
              on-save="org.dxos.operation.tasks.save"
              on-cancel="org.dxos.operation.tasks.cancel" />
        <fallback>
          <display label="Nothing selected." />
        </fallback>
      </show>
    </layout>
  </container>
`;

const MASTER_DETAIL_MULTI = trim`
  <container id="example">
    <use module="org.dxos.module.tasks" as="tasks" />
    <layout rows="1fr 1fr" resizable="true">
      <collection data-items="tasks.items" item-id="id" item-label="title"
                  data-selections="tasks.selections"
                  capability="tasks.multiSelect" />
      <switch on="tasks.selectionState">
        <match value="one">
          <form schema="org.dxos.type.Task" data-values="tasks.selectedOne"
                on-save="org.dxos.operation.tasks.save"
                on-cancel="org.dxos.operation.tasks.cancel" />
        </match>
        <match value="many">
          <display variant="title" data-text="tasks.selectionLabel" />
        </match>
        <match value="none">
          <display label="Nothing selected — click a row; shift-click toggles." />
        </match>
      </switch>
    </layout>
  </container>
`;

const COMBOBOX = trim`
  <container>
    <var name="title" type="org.dxos.type.Text" />
    <use module="org.dxos.module.picker" as="picker" />
    <display variant="title" data-text="title" />
    <combobox placeholder="Select task…"
              data-items="picker.filtered" item-id="id" item-label="title"
              data-value="picker.pickerLabel" data-filter="picker.filter"
              on-input="org.dxos.operation.picker.input"
              on-select="org.dxos.operation.picker.select" />
    <show when="picker.selected">
      <form schema="org.dxos.type.Task" data-values="picker.selected" />
    </show>
  </container>
`;

const FILTER_LIST = trim`
  <container>
    <use module="org.dxos.module.filter" as="filter" />
    <control label="Filter" placeholder="Type to filter…" data-value="filter.text"
             on-input="org.dxos.operation.filter.input" />
    <collection data-items="filter.filtered" item-id="id" item-label="title" />
  </container>
`;

const TABS = trim`
  <container id="example">
    <use module="org.dxos.module.tasks" as="tasks" />
    <let name="view" initial="list" />
    <tabs data-value="view" on-select="org.dxos.operation.view.set">
      <tab value="list" label="List" />
      <tab value="detail" label="Detail" />
    </tabs>
    <switch on="view">
      <match value="list">
        <collection data-items="tasks.items" item-id="id" item-label="title"
                    data-selection="tasks.selectionId"
                    on-select="org.dxos.operation.tasks.select" />
      </match>
      <match value="detail">
        <show when="tasks.selected">
          <form schema="org.dxos.type.Task" data-values="tasks.selected"
                on-save="org.dxos.operation.tasks.save"
                on-cancel="org.dxos.operation.tasks.cancel" />
          <fallback>
            <display label="Nothing selected." />
          </fallback>
        </show>
      </match>
    </switch>
  </container>
`;

//
// Story shell.
//

type StoryArgs = {
  /** Layouts by view-mode key; `pick` chooses from published state. Single-layout stories use one. */
  sources: Record<string, string>;
  pick?: (ui: UiState) => string;
};

const DefaultStory = ({ sources: initialSources, pick }: StoryArgs) => {
  const [sources, setSources] = useState(initialSources);
  const db = useTestDb();
  const tasks = useQuery(db, Filter.type(Task.Task));

  // The host wires the live query into the modules that declared it as an input.
  const inputs = useMemo<ModuleInputs>(
    () => ({
      [TASKS_MODULE]: { tasks },
      [PICKER_MODULE]: { tasks },
      [FILTER_MODULE]: { tasks },
    }),
    [tasks],
  );

  // Which layout renders is itself a function of published state — layout selection is the
  // meta-level of "entirely state-driven".
  const firstKey = Object.keys(sources)[0];
  const parsedAll = useMemo(() => {
    const out: Record<string, { node?: Node; error?: string }> = {};
    for (const [key, source] of Object.entries(sources)) {
      try {
        out[key] = { node: parse(source) };
      } catch (err) {
        out[key] = { error: String(err) };
      }
    }
    return out;
  }, [sources]);

  // Template lets are seeded from every layout, so switching layouts keeps instance state.
  const seedRoot = useMemo<Node>(() => {
    const children = Object.values(parsedAll)
      .map((entry) => entry.node)
      .filter((node): node is Node => !!node);
    return { tag: 'container', children };
  }, [parsedAll]);

  const { ui, log, dispatch, capabilities } = useSystem({ registry, root: seedRoot, db, inputs });
  const renderer = useMemo(() => createReactRenderer({ schemas: registry.schemas }), []);
  const editorExtensions = useMemo(() => templateLanguage(), []);
  const stateExtensions = useMemo(() => [json()], []);

  const activeKey = pick?.(ui) ?? firstKey;
  const active = parsedAll[activeKey] ?? parsedAll[firstKey];

  // The host side of the contract: values against the `var` signature, module views against the
  // `use` imports — both mount-checked, both visible when they fail (never garbage).
  const vars: Record<string, unknown> = { title: 'Tasks' };
  const modules = viewModules(registry, ui, inputs, capabilities);
  const mountErrors = active?.node
    ? [
        ...checkVars(registry.schemas, varDecls(active.node), vars, (schema, value) => {
          try {
            return Schema.is(schema)(value);
          } catch {
            return false;
          }
        }),
        ...checkUses(registry, active.node),
      ]
    : [];

  return (
    <Workbench
      panes={[
        {
          title: `Layout: ${activeKey}`,
          children: (
            <Editor
              key={activeKey}
              value={sources[activeKey] ?? ''}
              extensions={editorExtensions}
              onChange={(next) => setSources((current) => ({ ...current, [activeKey]: next }))}
            />
          ),
          size: 2,
        },
        {
          title: 'State',
          children: <Editor value={JSON.stringify(ui, null, 2)} extensions={stateExtensions} />,
        },
        {
          title: 'Operations',
          children: <OperationLog entries={log} />,
        },
      ]}
      main={{
        title: 'Rendered',
        children:
          active?.node && mountErrors.length === 0 ? (
            <AttentionProvider>
              <Template
                node={active.node}
                ui={ui}
                vars={vars}
                modules={modules}
                renderer={renderer}
                options={{ dispatch }}
              />
            </AttentionProvider>
          ) : (
            // A failed signature or module wiring renders its errors, never garbage.
            <span className='text-error-text text-sm whitespace-pre-wrap'>
              {active?.error ?? mountErrors.join('\n')}
            </span>
          ),
      }}
    />
  );
};

const meta: Meta<typeof DefaultStory> = {
  title: 'ui/ui-template/System',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { layout: 'fullscreen', translations: formTranslations },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const List: Story = {
  args: { sources: { list: LIST } },
};

export const FormStory: Story = {
  name: 'Form',
  args: {
    sources: {
      form: FORM,
    },
  },
};

export const MasterDetail: Story = {
  args: {
    sources: {
      'master-detail': MASTER_DETAIL,
    },
  },
};

export const MasterDetailToolbar: Story = {
  args: {
    sources: {
      toolbar: MASTER_DETAIL_TOOLBAR,
    },
  },
};

export const MasterDetailMulti: Story = {
  args: {
    sources: {
      'master-detail-multi': MASTER_DETAIL_MULTI,
    },
  },
};

export const ComboboxStory: Story = {
  name: 'Combobox',
  args: {
    sources: {
      combobox: COMBOBOX,
    },
  },
};

export const FilterList: Story = {
  args: {
    sources: {
      filter: FILTER_LIST,
    },
  },
};

export const TabsStory: Story = {
  name: 'Tabs',
  args: {
    sources: {
      tabs: TABS,
    },
  },
};
