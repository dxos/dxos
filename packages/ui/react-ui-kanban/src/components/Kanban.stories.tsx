//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React, { useEffect, useMemo, useState } from 'react';

import { type MutableSchema } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { useGlobalFilteredObjects } from '@dxos/plugin-search';
import { faker } from '@dxos/random';
import { Filter, useSpaces, useQuery, create } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { ViewEditor } from '@dxos/react-ui-form';
import { SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { ViewProjection, ViewType } from '@dxos/schema';
import { withLayout, withTheme } from '@dxos/storybook-utils';

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
  const [schema, setSchema] = useState<MutableSchema>();
  useEffect(() => {
    if (kanbans.length && !kanban) {
      const kanban = kanbans[0];
      invariant(kanban.cardView);
      setKanban(kanban);
      setSchema(space.db.schemaRegistry.getSchema(kanban.cardView!.query.typename));
    }
  }, [kanbans]);

  const projection = useMemo(() => {
    if (schema && kanban?.cardView) {
      return new ViewProjection(schema, kanban.cardView!);
    }
  }, [schema, kanban?.cardView]);

  const objects = useQuery(space, schema ? Filter.schema(schema) : Filter.nothing());
  const filteredObjects = useGlobalFilteredObjects(objects);

  const _model = useKanbanModel({
    kanban,
    projection,
    items: filteredObjects,
  });

  if (!schema || !kanban) {
    return null;
  }

  return (
    <div className='grow grid grid-cols-[1fr_350px]'>
      <div className='grid grid-rows-[min-content_1fr] min-bs-0 overflow-hidden'></div>
      <div className='flex flex-col h-full border-l border-separator overflow-y-auto'>
        {kanban.cardView && (
          <ViewEditor
            registry={space?.db.schemaRegistry}
            schema={schema}
            view={kanban.cardView}
            onDelete={(...args) => {
              console.log('[ViewEditor]', 'onDelete', args);
            }}
          />
        )}

        <SyntaxHighlighter language='json' className='w-full text-xs'>
          {JSON.stringify({ view: kanban.cardView, schema }, null, 2)}
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
        // TODO(thure): Why is giving KanbanType a problem here?
        const kanban = space.db.add(create(KanbanType as any, {})) as KanbanType;
        const schema = initializeKanban({ space, kanban, initialItem: false });
        Array.from({ length: 10 }).map(() => {
          return space.db.add(
            create(schema, {
              name: faker.person.fullName(),
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
