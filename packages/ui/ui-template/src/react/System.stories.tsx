//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React, { useMemo, useState } from 'react';

import { type Database, Filter, Obj } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { useQuery } from '@dxos/echo-react';
import { Flex } from '@dxos/react-ui';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Organization } from '@dxos/types';
import { trim } from '@dxos/util';

import { templateLanguage } from '../codemirror';
import { type Node } from '../model';
import { parse } from '../parser';
import { type Registry, type UiState, withInstance } from '../system';
import { Template, createReactRenderer } from './renderer';
import { Cell, Editor, OperationLog } from './testing';
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

const uiPatch = (ui: UiState, id: string, patch: Record<string, unknown>): UiState =>
  withInstance(ui, id, { ...ui[id], ...patch });

const registry: Registry<Db, Schema.Codec<any, any>> = {
  schemas: {
    [ORGANIZATION]: OrganizationForm,
  },

  machines: {
    'org.dxos.machine.master-detail': {
      key: 'org.dxos.machine.master-detail',
      initial: { selection: undefined, draft: false },
    },
    'org.dxos.machine.combobox': {
      key: 'org.dxos.machine.combobox',
      initial: { filter: '', value: undefined },
    },
    'org.dxos.machine.filter': {
      key: 'org.dxos.machine.filter',
      initial: { text: '' },
    },
    'org.dxos.machine.view': {
      key: 'org.dxos.machine.view',
      initial: { mode: 'list' },
    },
  },

  operations: {
    'org.dxos.operation.contacts.select': {
      key: 'org.dxos.operation.contacts.select',
      description: 'Select a row in the master list.',
      handler: ({ ui, payload }) => uiPatch(ui, 'contacts', { selection: payload, draft: false }),
    },
    'org.dxos.operation.contacts.add': {
      key: 'org.dxos.operation.contacts.add',
      description: 'Start a draft; the form edits a temporary object until save.',
      handler: ({ ui }) => uiPatch(ui, 'contacts', { selection: undefined, draft: true }),
    },
    'org.dxos.operation.contacts.save': {
      key: 'org.dxos.operation.contacts.save',
      description: 'Commit the form draft: update the selected object, or add the draft to the database.',
      handler: ({ ui, payload, db }) => {
        const values = (payload ?? {}) as OrganizationFormValues;
        const instance = ui.contacts ?? {};
        if (instance.draft) {
          db?.add(Organization.make(values));
          return uiPatch(ui, 'contacts', { draft: false });
        }
        const id = typeof instance.selection === 'string' ? instance.selection : undefined;
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
        return undefined;
      },
    },
    'org.dxos.operation.contacts.cancel': {
      key: 'org.dxos.operation.contacts.cancel',
      description: 'Discard the draft.',
      handler: ({ ui }) => uiPatch(ui, 'contacts', { draft: false }),
    },
    'org.dxos.operation.contacts.qualify': {
      key: 'org.dxos.operation.contacts.qualify',
      description: 'Toolbar action over the current selection: mark the organization qualified.',
      handler: ({ ui, db }) => {
        const id = typeof ui.contacts?.selection === 'string' ? ui.contacts.selection : undefined;
        const object = id ? db?.getObjectById<Organization.Organization>(id) : undefined;
        if (object) {
          Obj.update(object, (object) => {
            object.status = 'qualified';
          });
        }
        return undefined;
      },
    },
    'org.dxos.operation.picker.input': {
      key: 'org.dxos.operation.picker.input',
      handler: ({ ui, payload }) => uiPatch(ui, 'picker', { filter: String(payload ?? '') }),
    },
    'org.dxos.operation.picker.select': {
      key: 'org.dxos.operation.picker.select',
      handler: ({ ui, payload }) => uiPatch(ui, 'picker', { value: payload, filter: '' }),
    },
    'org.dxos.operation.filter.input': {
      key: 'org.dxos.operation.filter.input',
      handler: ({ ui, payload }) => uiPatch(ui, 'filter', { text: String(payload ?? '') }),
    },
    'org.dxos.operation.view.list': {
      key: 'org.dxos.operation.view.list',
      handler: ({ ui }) => uiPatch(ui, 'view', { mode: 'list' }),
    },
    'org.dxos.operation.view.detail': {
      key: 'org.dxos.operation.view.detail',
      handler: ({ ui }) => uiPatch(ui, 'view', { mode: 'detail' }),
    },
  },
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
  const contacts = ui.contacts ?? {};
  const filterText = String(ui.filter?.text ?? ui.picker?.filter ?? '').toLowerCase();
  const filtered = filterText
    ? organizations.filter((org) => (org.name ?? '').toLowerCase().includes(filterText))
    : organizations;
  const selected = contacts.draft
    ? {}
    : (organizations.find((org) => org.id === contacts.selection) ??
      organizations.find((org) => org.id === ui.picker?.value));
  const pickerValue = organizations.find((org) => org.id === ui.picker?.value);
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
  <container gap="sm">
    <display variant="title" data-text="title" />
    <collection data-items="organizations" item-id="id" item-label="name" />
  </container>
`;

const FORM = trim`
  <container gap="sm">
    <display variant="title" data-text="title" />
    <form schema="org.dxos.type.Organization" data-values="selected"
          on-save="org.dxos.operation.contacts.save"
          on-cancel="org.dxos.operation.contacts.cancel" />
  </container>
`;

const MASTER_DETAIL = trim`
  <layout direction="row" gap="md">
    <collection id="contacts" machine="org.dxos.machine.master-detail"
                data-items="organizations" item-id="id" item-label="name"
                data-selection="ui.contacts.selection"
                on-select="org.dxos.operation.contacts.select" />
    <form schema="org.dxos.type.Organization" data-values="selected"
          on-save="org.dxos.operation.contacts.save"
          on-cancel="org.dxos.operation.contacts.cancel" />
  </layout>
`;

const MASTER_DETAIL_TOOLBAR = trim`
  <container gap="sm">
    <command>
      <control as="button" label="Add" on-activate="org.dxos.operation.contacts.add" />
      <control as="button" label="Qualify" on-activate="org.dxos.operation.contacts.qualify" />
    </command>
    <layout direction="row" gap="md">
      <collection id="contacts" machine="org.dxos.machine.master-detail"
                  data-items="organizations" item-id="id" item-label="name"
                  data-selection="ui.contacts.selection"
                  on-select="org.dxos.operation.contacts.select" />
      <form schema="org.dxos.type.Organization" data-values="selected"
            on-save="org.dxos.operation.contacts.save"
            on-cancel="org.dxos.operation.contacts.cancel" />
    </layout>
  </container>
`;

const COMBOBOX = trim`
  <container gap="sm">
    <display variant="title" data-text="title" />
    <combobox id="picker" machine="org.dxos.machine.combobox" placeholder="Select organization…"
              data-items="filtered" item-id="id" item-label="name"
              data-value="pickerLabel" data-filter="ui.picker.filter"
              on-input="org.dxos.operation.picker.input"
              on-select="org.dxos.operation.picker.select" />
    <form schema="org.dxos.type.Organization" data-values="selected" />
  </container>
`;

const FILTER_LIST = trim`
  <container gap="sm">
    <control id="filter" machine="org.dxos.machine.filter" label="Filter"
             placeholder="Type to filter…" data-value="ui.filter.text"
             on-input="org.dxos.operation.filter.input" />
    <collection data-items="filtered" item-id="id" item-label="name" />
  </container>
`;

const VIEW_LIST = trim`
  <container gap="sm">
    <command>
      <control as="button" label="List" on-activate="org.dxos.operation.view.list" />
      <control as="button" label="Detail" on-activate="org.dxos.operation.view.detail" />
    </command>
    <collection id="contacts" machine="org.dxos.machine.master-detail"
                data-items="organizations" item-id="id" item-label="name"
                data-selection="ui.contacts.selection"
                on-select="org.dxos.operation.contacts.select" />
  </container>
`;

const VIEW_DETAIL = trim`
  <container gap="sm">
    <command>
      <control as="button" label="List" on-activate="org.dxos.operation.view.list" />
      <control as="button" label="Detail" on-activate="org.dxos.operation.view.detail" />
    </command>
    <form schema="org.dxos.type.Organization" data-values="selected"
          on-save="org.dxos.operation.contacts.save"
          on-cancel="org.dxos.operation.contacts.cancel" />
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
  const context = deriveContext(ui, organizations);
  const state = { title: 'Organizations', ...context };

  return (
    <Flex classNames='dx-container grid grid-cols-2 divide-x divide-separator' align='stretch'>
      <Flex column grow classNames='dx-container grid grid-rows-3 divide-y divide-separator'>
        <Cell title={`Layout (${activeKey})`}>
          <Editor
            key={activeKey}
            value={sources[activeKey] ?? ''}
            extensions={editorExtensions}
            onChange={(next) => setSources((current) => ({ ...current, [activeKey]: next }))}
          />
        </Cell>

        <Cell title='Published state'>
          <pre className='p-2 font-mono text-xs text-description whitespace-pre-wrap'>
            {JSON.stringify(ui, null, 2)}
          </pre>
        </Cell>

        <Cell title='Operation log'>
          <OperationLog entries={log} />
        </Cell>
      </Flex>

      <Cell title='Rendered'>
        {active?.node ? (
          <Template node={active.node} state={state} renderer={renderer} options={{ dispatch }} />
        ) : (
          <span className='text-error-text text-sm'>{active?.error}</span>
        )}
      </Cell>
    </Flex>
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

export const ViewSwitch: Story = {
  args: {
    sources: { list: VIEW_LIST, detail: VIEW_DETAIL },
    pick: (ui) => (ui.view?.mode === 'detail' ? 'detail' : 'list'),
  },
};
