//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React, { useMemo, useState } from 'react';

import { type Database, Filter, Obj } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { useQuery } from '@dxos/echo-react';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Organization } from '@dxos/types';
import { trim } from '@dxos/util';

import { templateLanguage } from '../codemirror';
import { type Node } from '../model';
import { parse } from '../parser';
import { type Registry, type UiState, checkVars, getIn, varDecls } from '../system';
import { Template, createReactRenderer } from './renderer';
import { Editor, OperationLog, Workbench } from './testing';
import { useSystem } from './useSystem';

//
// SPIKE. The system stories: one DefaultStory, per-story layout/context/state. Everything below a
// story's `source` runs through the same loop — parse → seed machines → derive context from
// (published state × live ECHO query) → render → operations → new state.
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
      const { db } = await builder.createDatabase({ types: [Organization.Organization] });
      ['Blue Yard', 'Backed', 'Protocol Labs', 'DXOS', 'Ink & Switch', 'Socket Supply'].forEach((name, index) => {
        db.add(Organization.make({ name, status: index % 2 === 0 ? 'prospect' : 'active' }));
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
// published state and may mutate the database; the query feeds mutations back as new context.
//

const ORGANIZATION = 'org.dxos.type.Organization';

/**
 * The FORM schema: the editable projection, not the stored type. `Type.getSchema(Organization)`
 * carries the ECHO `id` as a required field, which a draft cannot satisfy — a live reminder that
 * forms want a View (ONTOLOGY R-5), and the registry should hold both.
 */
const OrganizationForm = Schema.Struct({
  name: Schema.String.pipe(Schema.annotate({ title: 'Name' }), Schema.optional),
  description: Schema.String.pipe(Schema.annotate({ title: 'Description' }), Schema.optional),
  status: Schema.Literals(['prospect', 'qualified', 'active', 'commit', 'reject']).pipe(
    Schema.annotate({ title: 'Status' }),
    Schema.optional,
  ),
  website: Schema.String.pipe(Schema.annotate({ title: 'Website' }), Schema.optional),
});

type OrganizationFormValues = Schema.Schema.Type<typeof OrganizationForm>;

const toFormValues = (org: Organization.Organization): OrganizationFormValues => ({
  name: org.name,
  description: org.description,
  status: org.status,
  website: org.website,
});

const TEXT = 'org.dxos.type.Text';

const registry: Registry<Db, Schema.Codec<any, any>> = {
  schemas: {
    [ORGANIZATION]: OrganizationForm,
    [TEXT]: Schema.String,
  },

  // Slot machines: each names one value's initial state; a template's `let` binds it to a name.
  machines: {
    'org.dxos.machine.selection': {
      key: 'org.dxos.machine.selection',
      initial: undefined,
    },
    'org.dxos.machine.flag': {
      key: 'org.dxos.machine.flag',
      initial: false,
    },
    'org.dxos.machine.flag-set': {
      key: 'org.dxos.machine.flag-set',
      initial: true,
    },
    'org.dxos.machine.text': {
      key: 'org.dxos.machine.text',
      initial: '',
    },
    'org.dxos.machine.view': {
      key: 'org.dxos.machine.view',
      initial: 'list',
    },
  },

  // Operations are scope-relative: they read and write the dispatching node's slots by name,
  // resolved lexically — the same operation serves any template that declares the slot.
  operations: {
    'org.dxos.operation.contacts.select': {
      key: 'org.dxos.operation.contacts.select',
      description: 'Select a row in the master list.',
      handler: ({ scope, payload }) =>
        scope.set({ selection: payload, ...(scope.has('draft') ? { draft: false } : {}) }),
    },
    'org.dxos.operation.contacts.add': {
      key: 'org.dxos.operation.contacts.add',
      description: 'Start a draft; the form edits a temporary object until save.',
      handler: ({ scope }) => scope.set({ selection: undefined, draft: true }),
    },
    'org.dxos.operation.contacts.save': {
      key: 'org.dxos.operation.contacts.save',
      description: 'Commit the form draft: update the selected object, or add the draft to the database.',
      handler: ({ scope, payload, db }) => {
        const values = (payload ?? {}) as OrganizationFormValues;
        if (scope.get('draft') === true) {
          db?.add(Organization.make(values));
          scope.set({ draft: false });
          return;
        }
        const selection = scope.get('selection');
        const id = typeof selection === 'string' ? selection : undefined;
        const object = id ? db?.getObjectById<Organization.Organization>(id) : undefined;
        if (object) {
          // Field by field, never Object.assign: the form's values may carry keys the schema
          // projection does not own (the ECHO id is readonly).
          Obj.update(object, (object) => {
            object.name = values.name;
            object.description = values.description;
            object.status = values.status;
            object.website = values.website;
          });
        }
      },
    },
    'org.dxos.operation.contacts.cancel': {
      key: 'org.dxos.operation.contacts.cancel',
      description: 'Discard the draft.',
      handler: ({ scope }) => scope.set({ draft: false }),
    },
    'org.dxos.operation.contacts.qualify': {
      key: 'org.dxos.operation.contacts.qualify',
      description: 'Toolbar action over the current selection: mark the organization qualified.',
      handler: ({ scope, db }) => {
        const selection = scope.get('selection');
        const id = typeof selection === 'string' ? selection : undefined;
        const object = id ? db?.getObjectById<Organization.Organization>(id) : undefined;
        if (object) {
          Obj.update(object, (object) => {
            object.status = 'qualified';
          });
        }
      },
    },
    'org.dxos.operation.picker.input': {
      key: 'org.dxos.operation.picker.input',
      handler: ({ scope, payload }) => scope.set({ filter: String(payload ?? '') }),
    },
    'org.dxos.operation.picker.select': {
      key: 'org.dxos.operation.picker.select',
      handler: ({ scope, payload }) => scope.set({ value: payload, filter: '' }),
    },
    'org.dxos.operation.filter.input': {
      key: 'org.dxos.operation.filter.input',
      handler: ({ scope, payload }) => scope.set({ text: String(payload ?? '') }),
    },
    'org.dxos.operation.view.set': {
      key: 'org.dxos.operation.view.set',
      description: 'Tabs write which branch of the switch exists.',
      handler: ({ scope, payload }) => scope.set({ view: String(payload ?? 'list') }),
    },
  },

  modules: {},
};

//
// Context derivation: the pure function from (published state, query results) to the object the
// template binds against. This is where filtering and selection resolution live — never in a
// component (MVU).
//

type AppContext = {
  ui: UiState;
  organizations: readonly Organization.Organization[];
  filtered: readonly Organization.Organization[];
  selected: OrganizationFormValues | undefined;
  pickerLabel: string;
};

const deriveContext = (ui: UiState, organizations: readonly Organization.Organization[]): AppContext => {
  const filterText = String(getIn(ui, ['filter', 'text']) ?? getIn(ui, ['picker', 'filter']) ?? '').toLowerCase();
  const filtered = filterText
    ? organizations.filter((org) => (org.name ?? '').toLowerCase().includes(filterText))
    : organizations;
  const selected = getIn(ui, ['contacts', 'draft'])
    ? {}
    : (organizations.find((org) => org.id === getIn(ui, ['contacts', 'selection'])) ??
      organizations.find((org) => org.id === getIn(ui, ['picker', 'value'])));
  const pickerValue = organizations.find((org) => org.id === getIn(ui, ['picker', 'value']));
  return {
    ui,
    organizations,
    filtered,
    selected,
    pickerLabel: pickerValue?.name ?? '',
  };
};

//
// Layouts.
//

const LIST = trim`
  <container>
    <var name="title" type="org.dxos.type.Text" />
    <var name="organizations" type="org.dxos.type.Organization" many="true" />
    <display variant="title" data-text="title" />
    <collection data-items="organizations" item-id="id" item-label="name" />
  </container>
`;

const FORM = trim`
  <container id="contacts">
    <var name="title" type="org.dxos.type.Text" />
    <var name="selected" type="org.dxos.type.Organization" optional="true" />
    <let name="selection" machine="org.dxos.machine.selection" />
    <let name="draft" machine="org.dxos.machine.flag-set" />
    <display variant="title" data-text="title" />
    <form schema="org.dxos.type.Organization" data-values="selected"
          on-save="org.dxos.operation.contacts.save"
          on-cancel="org.dxos.operation.contacts.cancel" />
  </container>
`;

const MASTER_DETAIL = trim`
  <layout id="contacts" rows="1fr 1fr">
    <var name="organizations" type="org.dxos.type.Organization" many="true" />
    <var name="selected" type="org.dxos.type.Organization" optional="true" />
    <let name="selection" machine="org.dxos.machine.selection" />
    <let name="draft" machine="org.dxos.machine.flag" />
    <collection data-items="organizations" item-id="id" item-label="name"
                data-selection="selection"
                on-select="org.dxos.operation.contacts.select" />
    <show when="selected">
      <form schema="org.dxos.type.Organization" data-values="selected"
            on-save="org.dxos.operation.contacts.save"
            on-cancel="org.dxos.operation.contacts.cancel" />
      <fallback>
        <display label="Nothing selected." />
      </fallback>
    </show>
  </layout>
`;

const MASTER_DETAIL_TOOLBAR = trim`
  <container id="contacts">
    <var name="organizations" type="org.dxos.type.Organization" many="true" />
    <var name="selected" type="org.dxos.type.Organization" optional="true" />
    <let name="selection" machine="org.dxos.machine.selection" />
    <let name="draft" machine="org.dxos.machine.flag" />
    <command>
      <control as="button" label="Add" on-activate="org.dxos.operation.contacts.add" />
      <control as="button" label="Qualify" on-activate="org.dxos.operation.contacts.qualify" />
    </command>
    <layout rows="1fr 1fr">
      <collection data-items="organizations" item-id="id" item-label="name"
                  data-selection="selection"
                  on-select="org.dxos.operation.contacts.select" />
      <show when="selected">
        <form schema="org.dxos.type.Organization" data-values="selected"
              on-save="org.dxos.operation.contacts.save"
              on-cancel="org.dxos.operation.contacts.cancel" />
        <fallback>
          <display label="Nothing selected." />
        </fallback>
      </show>
    </layout>
  </container>
`;

const COMBOBOX = trim`
  <container id="picker">
    <var name="title" type="org.dxos.type.Text" />
    <var name="filtered" type="org.dxos.type.Organization" many="true" />
    <var name="selected" type="org.dxos.type.Organization" optional="true" />
    <var name="pickerLabel" type="org.dxos.type.Text" />
    <let name="filter" machine="org.dxos.machine.text" />
    <let name="value" machine="org.dxos.machine.selection" />
    <display variant="title" data-text="title" />
    <combobox placeholder="Select organization…"
              data-items="filtered" item-id="id" item-label="name"
              data-value="pickerLabel" data-filter="filter"
              on-input="org.dxos.operation.picker.input"
              on-select="org.dxos.operation.picker.select" />
    <show when="selected">
      <form schema="org.dxos.type.Organization" data-values="selected" />
    </show>
  </container>
`;

const FILTER_LIST = trim`
  <container id="filter">
    <var name="filtered" type="org.dxos.type.Organization" many="true" />
    <let name="text" machine="org.dxos.machine.text" />
    <control label="Filter" placeholder="Type to filter…" data-value="text"
             on-input="org.dxos.operation.filter.input" />
    <collection data-items="filtered" item-id="id" item-label="name" />
  </container>
`;

const TABS = trim`
  <container id="contacts">
    <var name="organizations" type="org.dxos.type.Organization" many="true" />
    <var name="selected" type="org.dxos.type.Organization" optional="true" />
    <let name="view" machine="org.dxos.machine.view" />
    <let name="selection" machine="org.dxos.machine.selection" />
    <tabs data-value="view" on-select="org.dxos.operation.view.set">
      <tab value="list" label="List" />
      <tab value="detail" label="Detail" />
    </tabs>
    <switch on="view">
      <match value="list">
        <collection data-items="organizations" item-id="id" item-label="name"
                    data-selection="selection"
                    on-select="org.dxos.operation.contacts.select" />
      </match>
      <match value="detail">
        <show when="selected">
          <form schema="org.dxos.type.Organization" data-values="selected"
                on-save="org.dxos.operation.contacts.save"
                on-cancel="org.dxos.operation.contacts.cancel" />
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

const EMPTY: Node = { tag: 'container' };

const DefaultStory = ({ sources: initialSources, pick }: StoryArgs) => {
  const [sources, setSources] = useState(initialSources);
  const db = useTestDb();
  const organizations = useQuery(db, Filter.type(Organization.Organization));

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

  // Machines are seeded from every layout, so switching layouts keeps instance state.
  const seedRoot = useMemo<Node>(() => {
    const children = Object.values(parsedAll)
      .map((entry) => entry.node)
      .filter((node): node is Node => !!node);
    return { tag: 'container', children };
  }, [parsedAll]);

  const { ui, log, dispatch } = useSystem({ registry, root: seedRoot, db });
  const renderer = useMemo(() => createReactRenderer({ schemas: registry.schemas }), []);
  const editorExtensions = useMemo(() => templateLanguage(), []);

  const activeKey = pick?.(ui) ?? firstKey;
  const active = parsedAll[activeKey] ?? parsedAll[firstKey];
  // What deriveContext produces is no longer ambient: it is the value the host supplies against
  // the template's `var` signature, narrowed and mount-checked against the registry's schemas.
  const context = deriveContext(ui, organizations);
  const vars: Record<string, unknown> = { title: 'Organizations', ...context };
  const mountErrors = active?.node
    ? checkVars(registry.schemas, varDecls(active.node), vars, (schema, value) => {
        try {
          return Schema.is(schema)(value);
        } catch {
          return false;
        }
      })
    : [];

  return (
    <Workbench
      panes={[
        {
          title: `Layout (${activeKey})`,
          children: (
            <Editor
              key={activeKey}
              value={sources[activeKey] ?? ''}
              extensions={editorExtensions}
              onChange={(next) => setSources((current) => ({ ...current, [activeKey]: next }))}
            />
          ),
        },
        {
          title: 'Published state',
          children: (
            <pre className='p-2 font-mono text-xs text-description whitespace-pre-wrap'>
              {JSON.stringify(ui, null, 2)}
            </pre>
          ),
        },
        { title: 'Operation log', children: <OperationLog entries={log} /> },
      ]}
      main={{
        title: 'Rendered',
        children:
          active?.node && mountErrors.length === 0 ? (
            <Template node={active.node} ui={ui} vars={vars} renderer={renderer} options={{ dispatch }} />
          ) : (
            // A failed signature renders its errors, never garbage (mount row of the error table).
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
