//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import type * as Schema from 'effect/Schema';
import React, { useMemo, useState } from 'react';

import { Filter, Type } from '@dxos/echo';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { Flex, useThemeContext } from '@dxos/react-ui';
import { useTextEditor } from '@dxos/react-ui-editor';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { Organization } from '@dxos/types';
import { compactSlots, createBasicExtensions, createThemeExtensions } from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';
import { trim } from '@dxos/util';

import { templateLanguage } from '../codemirror';
import { type Node } from '../model';
import { parse } from '../parser';
import { type Registry, type UiState, withInstance } from '../system';
import { Template, createReactRenderer } from './renderer';
import { useSystem } from './useSystem';

//
// SPIKE. The system stories: one DefaultStory, per-story layout/context/state. Everything below a
// story's `source` runs through the same loop — parse → seed machines → derive context from
// (published state × live ECHO query) → render → operations → new state.
//

type Db = NonNullable<ReturnType<typeof useSpaces>[number]>['db'];

//
// Registry. Everything a template references, by URI. Operations are the only writer: they step
// published state and may mutate the database; the query feeds mutations back as new context.
//

const ORGANIZATION = 'org.dxos.type.Organization';

const uiPatch = (ui: UiState, id: string, patch: Record<string, unknown>): UiState =>
  withInstance(ui, id, { ...ui[id], ...patch });

const registry: Registry<Db, Schema.Codec<any, any>> = {
  schemas: {
    [ORGANIZATION]: Type.getSchema(Organization.Organization),
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
        const values = (payload ?? {}) as Partial<Organization.Organization>;
        const instance = ui.contacts ?? {};
        if (instance.draft) {
          db?.add(Organization.make(values));
          return uiPatch(ui, 'contacts', { draft: false });
        }
        const id = typeof instance.selection === 'string' ? instance.selection : undefined;
        const object = id ? db?.getObjectById(id) : undefined;
        if (object) {
          Object.assign(object, values);
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
        const object = id ? db?.getObjectById(id) : undefined;
        if (object) {
          Object.assign(object, { status: 'qualified' });
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
  selected: Partial<Organization.Organization> | undefined;
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

type Area = 'template' | 'rendered' | 'state' | 'log';

const AREAS = `
  "template rendered"
  "state    log"
`;

const areaBorders: Record<Area, string> = {
  template: 'border-e border-b border-separator',
  rendered: 'border-b border-separator',
  state: 'border-e border-separator',
  log: '',
};

const Cell = ({ area, title, children }: { area: Area; title: string; children: React.ReactNode }) => (
  <Flex column style={{ gridArea: area }} classNames={mx('min-w-0', areaBorders[area])}>
    <div className='px-2 py-1 text-xs uppercase tracking-wide text-subdued border-be border-separator'>{title}</div>
    <Flex column grow classNames='min-h-0 overflow-auto'>
      {children}
    </Flex>
  </Flex>
);

const TemplateEditor = ({ value, onChange }: { value: string; onChange: (value: string) => void }) => {
  const { themeMode } = useThemeContext();
  const { parentRef } = useTextEditor(
    () => ({
      initialValue: value,
      extensions: [
        createThemeExtensions({ themeMode, slots: compactSlots, syntaxHighlighting: true, monospace: true }),
        createBasicExtensions({ lineWrapping: false }),
        ...templateLanguage(),
      ],
    }),
    // The editor owns the text once mounted; `value` in deps would recreate it per keystroke. The
    // story remounts the editor per story via `key`, which is when `value` legitimately changes.
    [themeMode],
  );

  return (
    <div
      ref={parentRef}
      className='flex-1 min-h-0 overflow-auto'
      onBlur={() => {
        // Mirrored on blur rather than per keystroke: re-seeding machines on every edit would
        // reset published state while typing.
        const text = parentRef.current?.querySelector('.cm-content')?.textContent;
        if (text != null) {
          onChange(text);
        }
      }}
    />
  );
};

type StoryArgs = {
  /** Layouts by view-mode key; `pick` chooses from published state. Single-layout stories use one. */
  sources: Record<string, string>;
  pick?: (ui: UiState) => string;
};

const EMPTY: Node = { tag: 'container' };

const DefaultStory = ({ sources: initialSources, pick }: StoryArgs) => {
  const [sources, setSources] = useState(initialSources);
  const spaces = useSpaces();
  const space = spaces[0];
  const organizations = useQuery(space?.db, Filter.type(Organization.Organization));

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

  const { ui, log, dispatch } = useSystem({ registry, root: seedRoot, db: space?.db });
  const renderer = useMemo(() => createReactRenderer({ schemas: registry.schemas }), []);

  const activeKey = pick?.(ui) ?? firstKey;
  const active = parsedAll[activeKey] ?? parsedAll[firstKey];
  const context = deriveContext(ui, organizations);
  const state = { title: 'Organizations', ...context };

  return (
    <Flex style={{ gridTemplateAreas: AREAS }} classNames='dx-container grid grid-rows-2 grid-cols-2' align='stretch'>
      <Cell area='template' title={`Layout (${activeKey})`}>
        <TemplateEditor
          key={activeKey}
          value={sources[activeKey] ?? ''}
          onChange={(next) => setSources((current) => ({ ...current, [activeKey]: next }))}
        />
      </Cell>

      <Cell area='rendered' title='Rendered'>
        <Flex column gap='md' classNames='p-2 overflow-auto'>
          {active?.node ? (
            <Template node={active.node} state={state} renderer={renderer} options={{ dispatch }} />
          ) : (
            <span className='text-error-text text-sm'>{active?.error}</span>
          )}
        </Flex>
      </Cell>

      <Cell area='state' title='Published state'>
        <pre className='p-2 font-mono text-xs text-description whitespace-pre-wrap'>{JSON.stringify(ui, null, 2)}</pre>
      </Cell>

      <Cell area='log' title='Operation log'>
        <Flex column gap='xs' classNames='p-2'>
          {log.map((entry, index) => (
            <span key={index} className='font-mono text-xs'>
              {entry.operation}
              {entry.payload !== undefined ? ` ${JSON.stringify(entry.payload)}` : ''}
            </span>
          ))}
        </Flex>
      </Cell>
    </Flex>
  );
};

const meta: Meta<typeof DefaultStory> = {
  title: 'ui/ui-template/System',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      types: [Organization.Organization],
      onCreateSpace: ({ space }) => {
        ['Blue Yard', 'Backed', 'Protocol Labs', 'DXOS', 'Ink & Switch', 'Socket Supply'].forEach((name, index) => {
          space.db.add(Organization.make({ name, status: index % 2 === 0 ? 'prospect' : 'active' }));
        });
      },
    }),
  ],
  parameters: { layout: 'fullscreen' },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const List: Story = { args: { sources: { list: LIST } } };
export const FormStory: Story = { name: 'Form', args: { sources: { form: FORM } } };
export const MasterDetail: Story = { args: { sources: { 'master-detail': MASTER_DETAIL } } };
export const MasterDetailToolbar: Story = { args: { sources: { toolbar: MASTER_DETAIL_TOOLBAR } } };
export const ComboboxStory: Story = { name: 'Combobox', args: { sources: { combobox: COMBOBOX } } };
export const FilterList: Story = { args: { sources: { filter: FILTER_LIST } } };
export const ViewSwitch: Story = {
  args: {
    sources: { list: VIEW_LIST, detail: VIEW_DETAIL },
    pick: (ui) => (ui.view?.mode === 'detail' ? 'detail' : 'list'),
  },
};
