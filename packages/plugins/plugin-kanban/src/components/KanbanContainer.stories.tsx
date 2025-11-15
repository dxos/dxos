//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback } from 'react';

import { IntentPlugin, SettingsPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Obj, type QueryAST, Type } from '@dxos/echo';
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
import { withTheme } from '@dxos/react-ui/testing';
import { ViewEditor } from '@dxos/react-ui-form';
import { Kanban as KanbanComponent, useKanbanModel, useProjectionModel } from '@dxos/react-ui-kanban';
import { Kanban } from '@dxos/react-ui-kanban/types';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { defaultTx } from '@dxos/react-ui-theme';
import { View, getTypenameFromQuery } from '@dxos/schema';
import { Organization, Person } from '@dxos/types';

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
  status: faker.helpers.arrayElement(Organization.StatusOptions).id as Organization.Organization['status'],
});

const StorybookKanban = () => {
  const client = useClient();
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const [object] = useQuery(space, Filter.type(Kanban.Kanban));
  const typename = object?.view.target?.query ? getTypenameFromQuery(object.view.target.query.ast) : undefined;
  const schema = useSchema(client, space, typename);

  const objects = useQuery(space, schema ? Filter.type(schema) : Filter.nothing());
  const filteredObjects = useGlobalFilteredObjects(objects);

  const projection = useProjectionModel(schema, object);
  const model = useKanbanModel({
    object,
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
    (newQuery: QueryAST.Query) => {
      invariant(schema);
      invariant(Type.isMutable(schema));
      invariant(object.view.target);

      schema.updateTypename(getTypenameFromQuery(newQuery));
      object.view.target.query.ast = newQuery;
    },
    [object, schema],
  );

  if (!schema || !object.view.target) {
    return null;
  }

  return (
    <div className='grow grid grid-cols-[1fr_350px]'>
      {model ? <KanbanComponent model={model} onAddCard={handleAddCard} onRemoveCard={handleRemoveCard} /> : <div />}
      <div className='flex flex-col bs-full border-is border-separator overflow-y-auto'>
        <ViewEditor
          registry={space?.db.schemaRegistry}
          schema={schema}
          view={object.view.target}
          onQueryChanged={handleUpdateQuery}
          onDelete={(fieldId: string) => {
            console.log('[ViewEditor]', 'onDelete', fieldId);
          }}
        />
        <SyntaxHighlighter language='json' className='text-xs'>
          {JSON.stringify({ view: object.view.target, schema }, null, 2)}
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
          types: [Organization.Organization, Person.Person, View.View, Kanban.Kanban],
          onClientInitialized: async ({ client }) => {
            await client.halo.createIdentity();
            const space = await client.spaces.create();
            await space.waitUntilReady();
            const { view } = await View.makeFromSpace({
              client,
              space,
              typename: Organization.Organization.typename,
              pivotFieldName: 'status',
            });
            const kanban = Kanban.make({ view });
            space.db.add(kanban);

            // TODO(burdon): Replace with sdk/schema/testing.
            Array.from({ length: 80 }).map(() => {
              return space.db.add(Obj.make(Organization.Organization, rollOrg()));
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
