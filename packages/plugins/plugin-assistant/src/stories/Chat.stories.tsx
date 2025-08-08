//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { type FC } from 'react';

import { EXA_API_KEY } from '@dxos/ai/testing';
import { PLANNING_BLUEPRINT, RESEARCH_BLUEPRINT, ResearchDataTypes, ResearchGraph } from '@dxos/assistant-testing';
import { Obj, Ref } from '@dxos/echo';
import { Board, BoardPlugin } from '@dxos/plugin-board';
import { Chess, ChessPlugin } from '@dxos/plugin-chess';
import { InboxPlugin } from '@dxos/plugin-inbox';
import { Map, MapPlugin } from '@dxos/plugin-map';
import { MarkdownPlugin } from '@dxos/plugin-markdown';
import { Markdown } from '@dxos/plugin-markdown';
import { TablePlugin } from '@dxos/plugin-table';
import { useSpace } from '@dxos/react-client/echo';
import { DataType } from '@dxos/schema';
import { render } from '@dxos/storybook-utils';
import { trim } from '@dxos/util';

import { translations } from '../translations';

import {
  BlueprintContainer,
  ChatContainer,
  type ComponentProps,
  GraphContainer,
  SurfaceContainer,
  TasksContainer,
} from './components';
import { addTestData, config, getDecorators, testTypes } from './testing';

const DefaultStory = ({
  debug = true,
  components,
}: {
  debug?: boolean;
  components: (FC<ComponentProps> | FC<ComponentProps>[])[];
}) => {
  const space = useSpace();
  if (!space) {
    return null;
  }

  return (
    <div
      className='grid grid-cols gap-2 m-2'
      style={{ gridTemplateColumns: `repeat(${components.length}, minmax(0, 40rem))` }}
    >
      {components.map((Component, index) =>
        Array.isArray(Component) ? (
          <div
            key={index}
            className='grid grid-rows gap-2 overflow-hidden'
            style={{ gridTemplateRows: `repeat(${Component.length}, 1fr)` }}
          >
            {Component.map((Component, index) => (
              <div key={index} className='flex flex-col overflow-hidden bg-baseSurface rounded border border-separator'>
                <Component space={space} debug={debug} />
              </div>
            ))}
          </div>
        ) : (
          <div key={index} className='flex flex-col overflow-hidden bg-baseSurface rounded border border-separator'>
            <Component space={space} debug={debug} />
          </div>
        ),
      )}
    </div>
  );
};

const storybook = {
  title: 'plugins/plugin-assistant/Chat',
  render: render(DefaultStory),
  decorators: [],
  parameters: {
    translations,
    controls: { disable: true },
  },
} satisfies Meta<typeof DefaultStory>;

export default storybook;

type Story = StoryObj<typeof storybook>;

//
// Stories
//

export const Default = {
  decorators: getDecorators({
    config: config.remote,
  }),
  args: {
    components: [ChatContainer],
  },
} satisfies Story;

export const WithDocument = {
  decorators: getDecorators({
    plugins: [MarkdownPlugin()],
    config: config.remote,
    onInit: async ({ binder, space }) => {
      const object = space.db.add(
        Markdown.makeDocument({
          name: 'Document',
          content: trim`
            # Hello, world!

            This is a test.
          `,
        }),
      );
      await binder.bind({ objects: [Ref.make(object)] });
    },
  }),
  args: {
    components: [ChatContainer, SurfaceContainer],
  },
} satisfies Story;

export const WithBlueprints = {
  decorators: getDecorators({
    plugins: [InboxPlugin(), MarkdownPlugin(), TablePlugin()],
    blueprints: [PLANNING_BLUEPRINT],
    config: config.remote,
    onInit: async ({ binder, space }) => {
      const object = space.db.add(Markdown.makeDocument({ name: 'Tasks' }));
      await binder.bind({ objects: [Ref.make(object)] });
    },
  }),
  args: {
    components: [ChatContainer, [TasksContainer, BlueprintContainer]],
  },
} satisfies Story;

export const WithChess = {
  decorators: getDecorators({
    plugins: [ChessPlugin()],
    config: config.remote,
    types: [Chess.Game],
    onInit: async ({ binder, space }) => {
      // TODO(burdon): Add player DID (for user and assistant).
      const object = space.db.add(
        Chess.makeGame({
          name: 'Challenge',
          pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 7. Nc3 d5 8. exd5 Nxd5 9. O-O Be6 10. Qb3 Na5 11. Qa4+ c6 12. Bxd5 Bxc3 13. Bxe6 fxe6 *',
        }),
      );
      await binder.bind({ objects: [Ref.make(object)] });
    },
  }),
  args: {
    components: [ChatContainer, SurfaceContainer],
  },
} satisfies Story;

export const WithMap = {
  decorators: getDecorators({
    plugins: [MapPlugin()],
    config: config.remote,
    types: [Map.Map],
    onInit: async ({ binder, space }) => {
      const object = space.db.add(Map.makeMap());
      await binder.bind({ objects: [Ref.make(object)] });
    },
  }),
  args: {
    components: [ChatContainer, SurfaceContainer],
  },
} satisfies Story;

export const WithTrip = {
  decorators: getDecorators({
    plugins: [MarkdownPlugin(), MapPlugin()],
    config: config.remote,
    types: [Map.Map],
    onInit: async ({ binder, space }) => {
      // TODO(burdon): Table.
      {
        const object = space.db.add(Map.makeMap({ name: 'Trip' }));
        await binder.bind({ objects: [Ref.make(object)] });
      }
      {
        const object = space.db.add(
          Markdown.makeDocument({
            name: 'Itinerary',
            content: trim`
              # Itinerary

              ## Day 1

              - Visit the Sagrada Familia
              - Visit the Park Güell
              - Visit the Casa Batlló

              ## Day 2

              - Visit the Eiffel Tower
              - Visit the Louvre
              - Visit the Musée d'Orsay
            `,
          }),
        );
        await binder.bind({ objects: [Ref.make(object)] });
      }
      {
        const object = space.db.add(
          Markdown.makeDocument({
            name: 'Barcelona',
            content: trim`
              # Barcelona

              Barcelona is the capital and most populous city of Catalonia, an autonomous community in northeastern Spain. It is located on the Mediterranean coast, on the banks of the Llobregat River, in the comarca of the Baix Llobregat. The city is known for its rich history, vibrant culture, and stunning architecture, including the Sagrada Familia, Park Güell, and Casa Batlló.
            `,
          }),
        );
        await binder.bind({ objects: [Ref.make(object)] });
      }
    },
  }),
  args: {
    components: [ChatContainer, SurfaceContainer],
  },
} satisfies Story;

export const WithBoard = {
  decorators: getDecorators({
    plugins: [BoardPlugin()],
    config: config.remote,
    types: [Board.Board],
    onInit: async ({ binder, space }) => {
      const object = space.db.add(Board.makeBoard());
      await binder.bind({ objects: [Ref.make(object)] });
    },
  }),
  args: {
    debug: true,
    components: [ChatContainer, SurfaceContainer],
  },
} satisfies Story;

export const WithResearch = {
  decorators: getDecorators({
    plugins: [MarkdownPlugin(), TablePlugin()],
    blueprints: [RESEARCH_BLUEPRINT],
    config: config.persistent,
    types: [...ResearchDataTypes, ResearchGraph, DataType.AccessToken],
    accessTokens: [Obj.make(DataType.AccessToken, { source: 'exa.ai', token: EXA_API_KEY })],
  }),
  args: {
    components: [ChatContainer, [GraphContainer, BlueprintContainer]],
  },
} satisfies Story;

export const WithSearch = {
  decorators: getDecorators({
    config: config.remote,
    types: testTypes,
    onInit: async ({ space }) => {
      await addTestData(space);
    },
  }),
  args: {
    components: [ChatContainer, [GraphContainer]],
  },
} satisfies Story;
