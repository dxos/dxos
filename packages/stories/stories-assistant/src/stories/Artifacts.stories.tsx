//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { Filter, Ref, Type, View } from '@dxos/echo';
import { AssistantSkill } from '@dxos/plugin-assistant';
import { ChessSkill } from '@dxos/plugin-chess';
import { MapSkill } from '@dxos/plugin-map';
import { Markdown } from '@dxos/plugin-markdown';
import { ViewModel } from '@dxos/schema';
import { trim } from '@dxos/util';

import { Module } from '../components';
import { ModuleContainer, config, createDecorators } from '../testing';
import { storyDecorators, storyParameters } from './meta';

const meta: Meta<typeof ModuleContainer> = {
  title: 'stories/stories-assistant/Artifacts',
  render: ModuleContainer,
  decorators: storyDecorators,
  parameters: storyParameters,
};

export default meta;

type Story = StoryObj<typeof meta>;

export const WithChess: Story = {
  decorators: createDecorators({
    lazyPlugins: async () => {
      const [{ Chess }, { ChessPlugin }, { Game }, { GamePlugin }] = await Promise.all([
        import('@dxos/plugin-chess'),
        import('@dxos/plugin-chess/plugin'),
        import('@dxos/plugin-game'),
        import('@dxos/plugin-game/plugin'),
      ]);
      return {
        plugins: [GamePlugin(), ChessPlugin()],
        types: [Game, Chess.State],
      };
    },
    config: config.remote,
    onInit: async ({ space }) => {
      const [{ Chess }, { make: makeGame }] = await Promise.all([
        import('@dxos/plugin-chess'),
        import('@dxos/plugin-game'),
      ]);
      // TODO(burdon): Add player DID (for user and assistant).
      space.db.add(
        makeGame({
          name: 'The Game',
          variant: Chess.make({
            pgn: [
              '1. e4 e5',
              '2. Nf3 Nc6',
              '3. Bc4 Bc5',
              '4. c3 Nf6',
              '5. d4 exd4',
              '6. cxd4 Bb4+',
              '7. Nc3 d5',
              '8. exd5 Nxd5',
              '9. O-O Be6',
              '10. Qb3 Na5',
              '11. Qa4+ c6',
              '12. Bxd5 Bxc3',
              '13. Bxe6 fxe6',
              '*',
            ].join(' '),
          }),
        }),
      );
    },
    onChatCreated: async ({ space, binder }) => {
      const { Game } = await import('@dxos/plugin-game');
      const objects = await space.db.query(Filter.type(Game)).run();
      await binder.bind({ objects: objects.map((object) => Ref.make(object)) });
    },
  }),
  args: {
    showContext: true,
    layout: [[Module.Chat]],
    skills: [AssistantSkill.key, ChessSkill.key],
  },
};

// Test with prompt: Create 10 locations.
export const WithMap: Story = {
  decorators: createDecorators({
    lazyPlugins: async () => {
      const [{ Map }, { MapPlugin }, { TablePlugin }, { Table }, { createLocationSchema: _ }] = await Promise.all([
        import('@dxos/plugin-map'),
        import('@dxos/plugin-map/plugin'),
        import('@dxos/plugin-table/plugin'),
        import('@dxos/react-ui-table/types'),
        import('@dxos/plugin-map/testing'),
      ]);
      return {
        plugins: [MapPlugin(), TablePlugin()],
        types: [View.View, Map.Map, Table.Table],
      };
    },
    config: config.remote,
    onInit: async ({ space }) => {
      const [{ Map }, { Table }, { createLocationSchema }] = await Promise.all([
        import('@dxos/plugin-map'),
        import('@dxos/react-ui-table/types'),
        import('@dxos/plugin-map/testing'),
      ]);
      const type = await space.db.addType(createLocationSchema());
      const { view: tableView, jsonSchema } = await ViewModel.makeFromDatabase({
        db: space.db,
        typename: Type.getTypename(type),
      });
      const table = Table.make({ name: 'Table', view: tableView, jsonSchema });
      const { view: mapView } = await ViewModel.makeFromDatabase({
        db: space.db,
        typename: Type.getTypename(type),
        pivotFieldName: 'location',
      });
      const map = Map.make({ name: 'Map', view: mapView });
      space.db.add(table);
      space.db.add(map);
    },
    onChatCreated: async ({ space, binder }) => {
      const objects = await space.db.query(Filter.type(View.View)).run();
      await binder.bind({ objects: objects.map((object) => Ref.make(object)) });
    },
  }),
  args: {
    showContext: true,
    layout: [[Module.Chat]],
    skills: [AssistantSkill.key, MapSkill.key],
  },
};

export const WithTrip: Story = {
  decorators: createDecorators({
    lazyPlugins: async () => {
      const [{ MarkdownPlugin }, { Map }, { MapPlugin }] = await Promise.all([
        import('@dxos/plugin-markdown/plugin'),
        import('@dxos/plugin-map'),
        import('@dxos/plugin-map/plugin'),
      ]);
      return {
        plugins: [MarkdownPlugin(), MapPlugin()],
        types: [Map.Map],
      };
    },
    config: config.remote,
    onInit: async ({ space }) => {
      const { Map } = await import('@dxos/plugin-map');
      // TODO(burdon): Table.
      const map = Map.make({ name: 'Trip' });
      space.db.add(map);
      space.db.add(
        Markdown.make({
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
      space.db.add(
        Markdown.make({
          name: 'Barcelona',
          content: trim`
            # Barcelona

            Barcelona is the capital and most populous city of Catalonia, an autonomous community in northeastern Spain.
            It is located on the Mediterranean coast, on the banks of the Llobregat River, in the comarca of the Baix Llobregat.
            The city is known for its rich history, vibrant culture, and stunning architecture, including the Sagrada Familia, Park Güell, and Casa Batlló.
          `,
        }),
      );
    },
    onChatCreated: async ({ space, binder }) => {
      const { Map } = await import('@dxos/plugin-map');
      const objects = await space.db.query(Filter.or(Filter.type(Map.Map), Filter.type(Markdown.Document))).run();
      await binder.bind({ objects: objects.map((object) => Ref.make(object)) });
    },
  }),
  args: {
    showContext: true,
    layout: [[Module.Chat]],
  },
};

export const WithBoard: Story = {
  decorators: createDecorators({
    lazyPlugins: async () => {
      const [{ Board }, { BoardPlugin }] = await Promise.all([
        import('@dxos/plugin-board'),
        import('@dxos/plugin-board/plugin'),
      ]);
      return {
        plugins: [BoardPlugin()],
        types: [Board.Board],
      };
    },
    config: config.remote,
    onInit: async ({ space }) => {
      const { Board } = await import('@dxos/plugin-board');
      space.db.add(Board.makeBoard());
    },
    onChatCreated: async ({ space, binder }) => {
      const { Board } = await import('@dxos/plugin-board');
      const objects = await space.db.query(Filter.type(Board.Board)).run();
      await binder.bind({ objects: objects.map((object) => Ref.make(object)) });
    },
  }),
  args: {
    showContext: true,
    layout: [[Module.Chat]],
  },
};
