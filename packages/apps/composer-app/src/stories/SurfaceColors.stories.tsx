//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useCallback, useMemo, useRef } from 'react';

import {
  contributes,
  Capabilities,
  IntentPlugin,
  createResolver,
  defineCapability,
  LayoutAction,
  SettingsPlugin,
  useCapability,
} from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { GraphPlugin } from '@dxos/plugin-graph';
import { NavTreePlugin, NavTreeContainer } from '@dxos/plugin-navtree';
import { storybookGraphBuilders } from '@dxos/plugin-navtree/testing';
import { useGlobalFilteredObjects } from '@dxos/plugin-search';
import { StorybookLayoutPlugin } from '@dxos/plugin-storybook-layout';
import { ThemePlugin } from '@dxos/plugin-theme';
import { faker } from '@dxos/random';
import { useClient } from '@dxos/react-client';
import { Filter, useQuery, useSchema, live } from '@dxos/react-client/echo';
import { useClientProvider, withClientProvider } from '@dxos/react-client/testing';
import { Main } from '@dxos/react-ui';
import { Table, type TableController } from '@dxos/react-ui-table';
import {
  useTableModel,
  TablePresentation,
  TableType,
  initializeTable,
  TableToolbar,
  translations as tableTranslations,
} from '@dxos/react-ui-table';
import { defaultTx } from '@dxos/react-ui-theme';
import { ViewProjection, ViewType } from '@dxos/schema';
import { Testing, createObjectFactory } from '@dxos/schema/testing';
import { withLayout, withTheme } from '@dxos/storybook-utils';

faker.seed(0); // Required for consistent test results.

const StoryState = defineCapability<{ tab: string }>('story-state');

/**
 * Custom hook to create and manage a test table model for storybook demonstrations.
 * Provides table data, schema, and handlers for table operations.
 */
const useTestTableModel = () => {
  const client = useClient();
  const { space } = useClientProvider();
  const tableRef = useRef<TableController>(null);

  const filter = useMemo(() => Filter.schema(TableType), []);
  const tables = useQuery(space, filter);
  const table = useMemo(() => tables.at(0), [tables]);
  const schema = useSchema(client, space, table?.view?.target?.query.typename);

  const projection = useMemo(() => {
    if (schema && table?.view?.target) {
      return new ViewProjection(schema.jsonSchema, table.view.target);
    }
  }, [schema, table?.view?.target]);

  const features = useMemo(
    () => ({
      selection: { enabled: true, mode: 'multiple' as const },
      dataEditable: true,
      schemaEditable: false,
    }),
    [schema],
  );

  const objects = useQuery(space, schema ? Filter.schema(schema) : Filter.nothing());
  const filteredObjects = useGlobalFilteredObjects(objects);

  const model = useTableModel({
    table,
    projection,
    features,
    rows: filteredObjects,
  });

  const presentation = useMemo(() => {
    if (model) {
      return new TablePresentation(model);
    }
  }, [model]);

  const handleToolbarAction = useCallback((action: { type: string }) => {
    // no-op
  }, []);

  return {
    schema,
    table,
    tableRef,
    model,
    presentation,
    space,
    handleToolbarAction,
  };
};

const TableComponent = () => {
  const { tableRef, model, presentation, handleToolbarAction } = useTestTableModel();

  return (
    <div className='absolute inset-0 grid grid-rows-[min-content_1fr] min-bs-0'>
      <TableToolbar classNames='border-be border-separator' onAction={handleToolbarAction} ignoreAttention />
      <Table.Root>
        <Table.Main ref={tableRef} model={model} presentation={presentation} ignoreAttention />
      </Table.Root>
    </div>
  );
};

const KitchenSinkStory = () => {
  const state = useCapability(StoryState);
  const { model } = useTestTableModel();

  return (
    <Main.Root complementarySidebarState='closed' navigationSidebarState='expanded'>
      <Main.Overlay />
      <Main.NavigationSidebar label='Navigation' classNames='grid'>
        <NavTreeContainer tab={state.tab} />
      </Main.NavigationSidebar>
      <Main.Content bounce>
        <div className='bs-dvh relative'>{model ? <TableComponent /> : <div />}</div>
      </Main.Content>
    </Main.Root>
  );
};

const meta: Meta = {
  title: 'apps/composer-app/SurfaceColors',
  component: KitchenSinkStory,
  parameters: { translations: tableTranslations },
  decorators: [
    withPluginManager({
      plugins: [
        ThemePlugin({ tx: defaultTx }),
        StorybookLayoutPlugin({ initialState: { sidebarState: 'expanded' } }),
        GraphPlugin(),
        IntentPlugin(),
        SettingsPlugin(),
        NavTreePlugin(),
      ],
      capabilities: (context) => [
        contributes(StoryState, live({ tab: 'space-0' })),
        contributes(Capabilities.IntentResolver, [
          createResolver({
            intent: LayoutAction.UpdateLayout,
            filter: (data): data is any => true,
            resolve: ({ subject }) => {
              const state = context.requestCapability(StoryState);
              state.tab = subject;
            },
          }),
        ]),
        contributes(Capabilities.AppGraphBuilder, storybookGraphBuilders),
      ],
    }),
    withClientProvider({
      types: [TableType, ViewType, Testing.Contact, Testing.Organization],
      createIdentity: true,
      createSpace: true,
      onSpaceCreated: async ({ client, space }) => {
        const table = space.db.add(live(TableType, {}));
        await initializeTable({ client, space, table, typename: Testing.Contact.typename });

        const factory = createObjectFactory(space.db, faker as any);
        await factory([
          { type: Testing.Contact, count: 32 },
          { type: Testing.Organization, count: 1 },
        ]);
      },
    }),
    withLayout({ fullscreen: true }),
    withTheme,
  ],
};

export default meta;

type Story = StoryObj;

export const Default: Story = {};
