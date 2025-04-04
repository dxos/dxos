//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useCallback, useEffect, useState } from 'react';

import { useGlobalFilteredObjects } from '@dxos/plugin-search';
import { faker } from '@dxos/random';
import { useClient } from '@dxos/react-client';
import { Filter, useSpaces, useQuery, useSchema, create } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { ViewEditor } from '@dxos/react-ui-form';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { ViewType, ViewProjection } from '@dxos/schema';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Kanban } from './Kanban';
import { KanbanType, useKanbanModel } from '../defs';
import { initializeKanban } from '../testing';
import translations from '../translations';

faker.seed(0);

//
// Story components.
//

const StorybookKanban = () => {
  const client = useClient();
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const kanbans = useQuery(space, Filter.schema(KanbanType));
  const [kanban, setKanban] = useState<KanbanType>();
  const [projection, setProjection] = useState<ViewProjection>();
  const schema = useSchema(client, space, kanban?.cardView?.target?.query.typename);

  useEffect(() => {
    if (kanbans.length && !kanban) {
      const kanban = kanbans[0];
      setKanban(kanban);
    }
  }, [kanbans]);

  useEffect(() => {
    if (kanban?.cardView?.target && schema) {
      setProjection(new ViewProjection(schema, kanban.cardView.target));
    }
    // TODO(ZaymonFC): Is there a better way to get notified about deep changes in the json schema?
  }, [kanban?.cardView?.target, schema, JSON.stringify(schema?.jsonSchema)]);

  const objects = useQuery(space, schema ? Filter.schema(schema) : Filter.nothing());
  const filteredObjects = useGlobalFilteredObjects(objects);

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
        const card = create(schema, {
          title: faker.commerce.productName(),
          description: faker.lorem.paragraph(),
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
      if (kanban?.cardView?.target) {
        schema?.mutable.updateTypename(typename);
        kanban.cardView.target.query.typename = typename;
      }
    },
    [kanban?.cardView?.target, schema],
  );

  if (!schema || !kanban) {
    return null;
  }

  return (
    <div className='grow grid grid-cols-[1fr_350px]'>
      {model ? <Kanban model={model} onAddCard={handleAddCard} onRemoveCard={handleRemoveCard} /> : <div />}
      <div className='flex flex-col bs-full border-is border-separator overflow-y-auto'>
        {kanban.cardView && (
          <ViewEditor
            registry={space?.db.schemaRegistry}
            schema={schema}
            view={kanban.cardView.target!}
            onTypenameChanged={handleTypenameChanged}
            onDelete={(fieldId: string) => {
              console.log('[ViewEditor]', 'onDelete', fieldId);
            }}
          />
        )}
        <SyntaxHighlighter language='json' className='w-full text-xs'>
          {JSON.stringify({ cardView: kanban.cardView?.target, cardSchema: schema }, null, 2)}
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
  title: 'ui/react-ui-kanban/Kanban',
  component: StorybookKanban,
  render: () => <StorybookKanban />,
  parameters: { translations },
  decorators: [
    withClientProvider({
      types: [KanbanType, ViewType],
      createIdentity: true,
      createSpace: true,
      onSpaceCreated: async ({ space }) => {
        const { schema, kanban } = await initializeKanban({ space });
        space.db.add(kanban);

        // TODO(burdon): Replace with sdk/schema/testing.
        Array.from({ length: 80 }).map(() => {
          return space.db.add(
            create(schema, {
              title: faker.commerce.productName(),
              description: faker.lorem.paragraph(),
            }),
          );
        });
      },
    }),
    withTheme,
    withLayout({ fullscreen: true, tooltips: true }),
  ],
};

export default meta;

type Story = StoryObj<StoryProps>;

export const Default: Story = {};
