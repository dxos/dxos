//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import React, { useCallback, useEffect, useState } from 'react';

import { useGlobalFilteredObjects } from '@dxos/plugin-search';
import { faker } from '@dxos/random';
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
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const kanbans = useQuery(space, Filter.schema(KanbanType));
  const [kanban, setKanban] = useState<KanbanType>();
  const [projection, setProjection] = useState<ViewProjection>();
  const cardSchema = useSchema(space, kanban?.cardView?.target?.query.type);

  useEffect(() => {
    if (kanbans.length && !kanban) {
      const kanban = kanbans[0];
      setKanban(kanban);
    }
  }, [kanbans]);

  useEffect(() => {
    if (kanban?.cardView?.target && cardSchema) {
      setProjection(new ViewProjection(cardSchema, kanban.cardView.target));
    }
    // TODO(ZaymonFC): Is there a better way to get notified about deep changes in the json schema?
  }, [kanban?.cardView?.target, cardSchema, JSON.stringify(cardSchema?.jsonSchema)]);

  const objects = useQuery(space, cardSchema ? Filter.schema(cardSchema) : Filter.nothing());
  const filteredObjects = useGlobalFilteredObjects(objects);

  const model = useKanbanModel({
    kanban,
    cardSchema,
    projection,
    items: filteredObjects,
  });

  const handleAddCard = useCallback(
    (columnValue: string | undefined) => {
      const path = model?.columnFieldPath;
      if (space && cardSchema && path) {
        space.db.add(
          create(cardSchema, {
            title: faker.commerce.productName(),
            description: faker.lorem.paragraph(),
            [path]: columnValue,
          }),
        );
      }
    },
    [space, cardSchema, model],
  );

  const handleRemoveCard = useCallback((card: { id: string }) => space.db.remove(card), [space]);

  const onTypenameChanged = useCallback(
    (typename: string) => {
      if (kanban?.cardView?.target) {
        cardSchema?.updateTypename(typename);
        kanban.cardView.target.query.type = typename;
      }
    },
    [kanban?.cardView?.target, cardSchema],
  );

  if (!cardSchema || !kanban) {
    return null;
  }

  return (
    <div className='grow grid grid-cols-[1fr_350px]'>
      {model ? <Kanban model={model} onAddCard={handleAddCard} onRemoveCard={handleRemoveCard} /> : <div />}
      <div className='flex flex-col bs-full border-is border-separator overflow-y-auto'>
        {kanban.cardView && (
          <ViewEditor
            registry={space?.db.schemaRegistry}
            schema={cardSchema}
            view={kanban.cardView.target!}
            onTypenameChanged={onTypenameChanged}
            onDelete={(fieldId: string) => {
              console.log('[ViewEditor]', 'onDelete', fieldId);
            }}
          />
        )}
        <SyntaxHighlighter language='json' className='w-full text-xs'>
          {JSON.stringify({ view: kanban.cardView?.target, cardSchema }, null, 2)}
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
        const { schema } = await initializeKanban({ space });
        // TODO(burdon): Replace with sdk/schema/testing.
        Array.from({ length: 8 }).map(() => {
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
