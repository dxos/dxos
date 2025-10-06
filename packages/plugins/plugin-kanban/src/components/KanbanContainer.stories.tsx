//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useEffect, useState } from 'react';

import { IntentPlugin, SettingsPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Obj, Query, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { ClientPlugin } from '@dxos/plugin-client';
import { PreviewPlugin } from '@dxos/plugin-preview';
import { useGlobalFilteredObjects } from '@dxos/plugin-search';
import { SpacePlugin } from '@dxos/plugin-space';
import { StorybookLayoutPlugin } from '@dxos/plugin-storybook-layout';
import { ThemePlugin } from '@dxos/plugin-theme';
import { faker } from '@dxos/random';
import { useClient } from '@dxos/react-client';
import { Filter, useQuery, useSchema, useSpaces } from '@dxos/react-client/echo';
import { ViewEditor } from '@dxos/react-ui-form';
import { Kanban as KanbanComponent, useKanbanModel } from '@dxos/react-ui-kanban';
import { Kanban } from '@dxos/react-ui-kanban/types';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { defaultTx } from '@dxos/react-ui-theme';
import { DataType, ProjectionModel, typenameFromQuery } from '@dxos/schema';
import { withTheme } from '@dxos/react-ui/testing';

import { translations } from '../translations';

faker.seed(0);

//
// Story components.
//

const rollOrg = () => ({
  name: faker.commerce.productName(),
  description: faker.lorem.paragraph(),
  image: faker.image.url(),
  website: faker.internet.url(),
  status: faker.helpers.arrayElement(DataType.OrganizationStatusOptions).id as DataType.Organization['status'],
});

const StorybookKanban = () => {
  const client = useClient();
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const views = useQuery(space, Filter.type(DataType.View));
  const [view, setView] = useState<DataType.View>();
  const [projection, setProjection] = useState<ProjectionModel>();
  const typename = view?.query ? typenameFromQuery(view.query) : undefined;
  const schema = useSchema(client, space, typename);

  useEffect(() => {
    if (views.length && !view) {
      const view = views[0];
      setView(view);
    }
  }, [views]);

  useEffect(() => {
    if (view?.projection && schema) {
      const jsonSchema = Type.toJsonSchema(schema);
      setProjection(new ProjectionModel(jsonSchema, view.projection));
    }
    // TODO(ZaymonFC): Is there a better way to get notified about deep changes in the json schema?
    //  @dmaretskyi? Once resolved, update in multiple places (e.g., storybooks).
  }, [view?.projection, schema, JSON.stringify(schema ? Type.toJsonSchema(schema) : {})]);

  const objects = useQuery(space, schema ? Filter.type(schema) : Filter.nothing());
  const filteredObjects = useGlobalFilteredObjects(objects);

  const model = useKanbanModel({
    view,
    schema,
    projection,
    items: filteredObjects,
  });

  const handleAddCard = useCallback(
    (columnValue: string | undefined) => {
      const path = model?.columnFieldPath;
      if (space && schema && path) {
        const card = Obj.make(schema, {
          ...rollOrg(),
          [path]: columnValue,
        });

        space.db.add(card);
        return card.id;
      }
    },
    [space, schema, model],
  );

  const handleRemoveCard = useCallback((card: { id: string }) => space.db.remove(card), [space]);

  const handleUpdateQuery = useCallback(
    (typename: string) => {
      invariant(schema);
      invariant(Type.isMutable(schema));
      invariant(view);

      schema.updateTypename(typename);
      view.query = Query.select(Filter.typename(typename)).ast;
    },
    [view, schema],
  );

  if (!schema || !view) {
    return null;
  }

  return (
    <div className='grow grid grid-cols-[1fr_350px]'>
      {model ? <KanbanComponent model={model} onAddCard={handleAddCard} onRemoveCard={handleRemoveCard} /> : <div />}
      <div className='flex flex-col bs-full border-is border-separator overflow-y-auto'>
        <ViewEditor
          registry={space?.db.schemaRegistry}
          schema={schema}
          view={view}
          onQueryChanged={handleUpdateQuery}
          onDelete={(fieldId: string) => {
            console.log('[ViewEditor]', 'onDelete', fieldId);
          }}
        />
        <SyntaxHighlighter language='json' className='text-xs'>
          {JSON.stringify({ view, schema }, null, 2)}
        </SyntaxHighlighter>
      </div>
    </div>
  );
};

type StoryProps = {
  rows?: number;
};

//
// Story definitions.
//

const meta = {
  title: 'plugins/plugin-kanban/Kanban',
  component: StorybookKanban,
  render: () => <StorybookKanban />,
  decorators: [
    withTheme,
    withPluginManager({
      plugins: [
        ClientPlugin({
          types: [DataType.Organization, DataType.Person, DataType.View, Kanban.Kanban],
          onClientInitialized: async ({ client }) => {
            await client.halo.createIdentity();
            const space = await client.spaces.create();
            await space.waitUntilReady();
            const { view } = await Kanban.makeView({
              client,
              space,
              typename: DataType.Organization.typename,
              pivotFieldName: 'status',
            });
            space.db.add(view);

            // TODO(burdon): Replace with sdk/schema/testing.
            Array.from({ length: 80 }).map(() => {
              return space.db.add(Obj.make(DataType.Organization, rollOrg()));
            });
          },
        }),
        SpacePlugin({}),
        IntentPlugin(),
        SettingsPlugin(),

        // UI
        ThemePlugin({ tx: defaultTx }),
        PreviewPlugin(),
        StorybookLayoutPlugin({}),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof StorybookKanban>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
