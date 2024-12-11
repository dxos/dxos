//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React, { useEffect, useState } from 'react';

import { type MutableSchema } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { useGlobalFilteredObjects } from '@dxos/plugin-search';
import { faker } from '@dxos/random';
import { Filter, useSpaces, useQuery, create } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { ViewEditor } from '@dxos/react-ui-form';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { ViewType } from '@dxos/schema';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Kanban } from './Kanban';
import { KanbanType, useKanbanModel } from '../defs';
import { initializeKanban } from '../testing';
import translations from '../translations';

faker.seed(0);

const stateColumns = { init: { label: 'To do' }, doing: { label: 'Doing' }, done: { label: 'Done' } };
const states = Object.keys(stateColumns);

//
// Story components.
//

const StorybookKanban = () => {
  const spaces = useSpaces();
  const space = spaces[spaces.length - 1];
  const kanbans = useQuery(space, Filter.schema(KanbanType));
  const [kanban, setKanban] = useState<KanbanType>();
  const [cardSchema, setCardSchema] = useState<MutableSchema>();
  useEffect(() => {
    if (kanbans.length && !kanban) {
      const kanban = kanbans[0];
      invariant(kanban.cardView);
      setKanban(kanban);
      setCardSchema(space.db.schemaRegistry.getSchema(kanban.cardView!.query.type));
    }
  }, [kanbans]);

  const objects = useQuery(space, cardSchema ? Filter.schema(cardSchema) : Filter.nothing());
  const filteredObjects = useGlobalFilteredObjects(objects);

  const model = useKanbanModel({
    kanban,
    cardSchema,
    items: filteredObjects,
  });

  if (!cardSchema || !kanban) {
    return null;
  }

  return (
    <div className='grow grid grid-cols-[1fr_350px]'>
      {model ? <Kanban model={model} columns={stateColumns} /> : <div />}
      <div className='flex flex-col bs-full border-is border-separator overflow-y-auto'>
        {kanban.cardView && (
          <ViewEditor
            registry={space?.db.schemaRegistry}
            schema={cardSchema}
            view={kanban.cardView}
            onDelete={(...args) => {
              console.log('[ViewEditor]', 'onDelete', args);
            }}
          />
        )}
        <SyntaxHighlighter language='json' className='w-full text-xs'>
          {JSON.stringify({ view: kanban.cardView, cardSchema }, null, 2)}
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
        const { taskSchema } = initializeKanban({ space });
        Array.from({ length: 24 }).map(() => {
          return space.db.add(
            create(taskSchema, {
              title: faker.commerce.productName(),
              description: faker.lorem.paragraph(),
              state: states[faker.number.int(states.length)],
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

// type Story = StoryObj<StoryProps>;

export const Default = {};
