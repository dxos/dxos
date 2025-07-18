//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react-vite';
import React, { useCallback, useEffect, useState } from 'react';

import { IntentPlugin, SettingsPlugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Obj, Ref, Relation, Type } from '@dxos/echo';
import { type EchoSchema } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { ClientPlugin } from '@dxos/plugin-client';
import { PreviewPlugin } from '@dxos/plugin-preview';
import { useGlobalFilteredObjects } from '@dxos/plugin-search';
import { SpacePlugin } from '@dxos/plugin-space';
import { StorybookLayoutPlugin } from '@dxos/plugin-storybook-layout';
import { ThemePlugin } from '@dxos/plugin-theme';
import { faker } from '@dxos/random';
import { useClient } from '@dxos/react-client';
import { Filter, useSpaces, useQuery, useSchema } from '@dxos/react-client/echo';
import { ViewEditor } from '@dxos/react-ui-form';
import { Kanban, KanbanView, useKanbanModel } from '@dxos/react-ui-kanban';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { defaultTx } from '@dxos/react-ui-theme';
import { DataType, ProjectionManager } from '@dxos/schema';
import { withLayout } from '@dxos/storybook-utils';

import { initializeKanban } from '../testing';
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
  status: faker.helpers.arrayElement(DataType.OrganizationStatusOptions).id,
});

const StorybookKanban = () => {
  const client = useClient();
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const views = useQuery(space, Filter.type(DataType.HasView));
  const [view, setView] = useState<DataType.HasView>();
  const [projection, setProjection] = useState<ProjectionManager>();
  const schema = useSchema(client, space, view?.projection.target?.query.typename);

  useEffect(() => {
    if (views.length && !view) {
      const view = views[0];
      setView(view);
    }
  }, [views]);

  useEffect(() => {
    if (view?.projection.target && schema) {
      const jsonSchema = Type.toJsonSchema(schema);
      setProjection(new ProjectionManager(jsonSchema, view.projection.target));
    }
    // TODO(ZaymonFC): Is there a better way to get notified about deep changes in the json schema?
    //  @dmaretskyi? Once resolved, update in multiple places (e.g., storybooks).
  }, [view?.projection.target, schema, JSON.stringify(schema ? Type.toJsonSchema(schema) : {})]);

  const objects = useQuery(space, schema ? Filter.type(schema) : Filter.nothing());
  const filteredObjects = useGlobalFilteredObjects(objects);

  // TODO(wittjosiah): Remove cast.
  const kanban = Relation.getTarget(view as any) as KanbanView;
  const model = useKanbanModel({
    kanban,
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

  const handleTypenameChanged = useCallback(
    (typename: string) => {
      invariant(schema);
      invariant(Type.isMutable(schema));
      invariant(view?.projection.target);

      schema.updateTypename(typename);
      view.projection.target.query.typename = typename;
    },
    [view?.projection.target, schema],
  );

  if (!schema || !view) {
    return null;
  }

  return (
    <div className='grow grid grid-cols-[1fr_350px]'>
      {model ? <Kanban model={model} onAddCard={handleAddCard} onRemoveCard={handleRemoveCard} /> : <div />}
      <div className='flex flex-col bs-full border-is border-separator overflow-y-auto'>
        {view.projection.target && (
          <ViewEditor
            registry={space?.db.schemaRegistry}
            schema={schema}
            projection={view.projection.target}
            onTypenameChanged={handleTypenameChanged}
            onDelete={(fieldId: string) => {
              console.log('[ViewEditor]', 'onDelete', fieldId);
            }}
          />
        )}
        <SyntaxHighlighter language='json' className='w-full text-xs'>
          {JSON.stringify({ cardView: view.projection.target, cardSchema: schema }, null, 2)}
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

const meta: Meta<StoryProps> = {
  title: 'plugins/plugin-kanban/Kanban',
  component: StorybookKanban,
  render: () => <StorybookKanban />,
  parameters: { translations },
  decorators: [
    withLayout({ fullscreen: true }),
    withPluginManager({
      plugins: [
        ClientPlugin({
          types: [DataType.Organization, DataType.Person, DataType.HasView, KanbanView],
          onClientInitialized: async (_, client) => {
            await client.halo.createIdentity();
            const space = await client.spaces.create();
            await space.waitUntilReady();
            const { projection, kanban, schema } = await initializeKanban({
              space,
              client,
              typename: DataType.Organization.typename,
              initialPivotColumn: 'status',
            });
            const hasView = Relation.make(DataType.HasView, {
              // TODO(wittjosiah): Remove cast.
              [Relation.Source]: (schema as unknown as EchoSchema).storedSchema,
              [Relation.Target]: kanban,
              projection: Ref.make(projection),
            });
            space.db.add(kanban);
            space.db.add(hasView);

            if (schema) {
              // TODO(burdon): Replace with sdk/schema/testing.
              Array.from({ length: 80 }).map(() => {
                return space.db.add(Obj.make(schema, rollOrg()));
              });
            }
          },
        }),
        StorybookLayoutPlugin(),
        PreviewPlugin(),
        SpacePlugin(),
        IntentPlugin(),
        SettingsPlugin(),
        ThemePlugin({ tx: defaultTx }),
      ],
    }),
  ],
};

export default meta;

type Story = StoryObj<StoryProps>;

export const Default: Story = {};
