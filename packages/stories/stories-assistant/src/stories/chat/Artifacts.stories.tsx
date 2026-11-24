//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { Filter, Ref, Type, View } from '@dxos/echo';
import * as AssistantSkill from '@dxos/plugin-assistant/AssistantSkill';
import * as BrainSkill from '@dxos/plugin-brain/BrainSkill';
import * as RemoteFactStorePlugin from '@dxos/plugin-brain/RemoteFactStorePlugin';
import * as ChessSkill from '@dxos/plugin-chess/ChessSkill';
import * as MapSkill from '@dxos/plugin-map/MapSkill';
import * as Markdown from '@dxos/plugin-markdown/Markdown';
import * as Presentation from '@dxos/plugin-presenter/Presentation';
import * as Sheet from '@dxos/plugin-sheet/Sheet';
import { ViewModel } from '@dxos/schema';
import * as ModuleContainer from '@dxos/storybook-testing/ModuleContainer';
import { trim } from '@dxos/util';

import { StoryRole } from '../../modules/index.ts';
import { createDecorators, storyParameters } from '../../testing/index.ts';
const meta: Meta<typeof ModuleContainer.Root> = {
  title: 'stories/stories-assistant/chat/Artifacts',
  render: ModuleContainer.Root,
  parameters: storyParameters,
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: createDecorators({
    lazyPlugins: async () => {
      const [{ Chess }, ChessPlugin, { Game }, GamePlugin] = await Promise.all([
        import('@dxos/plugin-chess'),
        import('@dxos/plugin-chess/ChessPlugin'),
        import('@dxos/plugin-game'),
        import('@dxos/plugin-game/GamePlugin'),
      ]);
      return {
        plugins: [GamePlugin.make(), ChessPlugin.make()],
        types: [Game.Game, Chess.State],
      };
    },
    onInit: async ({ space }) => {
      const [{ Chess }, { Game }] = await Promise.all([import('@dxos/plugin-chess'), import('@dxos/plugin-game')]);
      // TODO(burdon): Add player DID (for user and assistant).
      space.db.add(
        Game.make({
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
    onChatCreated: async ({ db, binder }) => {
      const { Game } = await import('@dxos/plugin-game');
      const objects = await db.query(Filter.type(Game.Game)).run();
      await binder.bind({ objects: objects.map((object) => Ref.make(object)) });
    },
    skills: [AssistantSkill.key, ChessSkill.key],
  }),
  args: {
    layout: [[StoryRole.Chat], [StoryRole.Context]],
  },
};

// Test with prompt: Create 10 locations.
export const WithMap: Story = {
  decorators: createDecorators({
    lazyPlugins: async () => {
      const [{ Map }, MapPlugin, TablePlugin, { Table }, { createLocationSchema: _ }] = await Promise.all([
        import('@dxos/plugin-map'),
        import('@dxos/plugin-map/MapPlugin'),
        import('@dxos/plugin-table/TablePlugin'),
        import('@dxos/react-ui-table/types'),
        import('@dxos/plugin-map/testing'),
      ]);
      return {
        plugins: [MapPlugin.make(), TablePlugin.make()],
        types: [View.View, Map.Map, Table.Table],
      };
    },
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
    onChatCreated: async ({ db, binder }) => {
      const objects = await db.query(Filter.type(View.View)).run();
      await binder.bind({ objects: objects.map((object) => Ref.make(object)) });
    },
    skills: [AssistantSkill.key, MapSkill.key],
  }),
  args: {
    layout: [[StoryRole.Chat], [StoryRole.Context]],
  },
};

export const WithTrip: Story = {
  decorators: createDecorators({
    lazyPlugins: async () => {
      const [MarkdownPlugin, { Map }, MapPlugin] = await Promise.all([
        import('@dxos/plugin-markdown/MarkdownPlugin'),
        import('@dxos/plugin-map'),
        import('@dxos/plugin-map/MapPlugin'),
      ]);
      return {
        plugins: [MarkdownPlugin.make(), MapPlugin.make()],
        types: [Map.Map],
      };
    },
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
    onChatCreated: async ({ db, binder }) => {
      const { Map } = await import('@dxos/plugin-map');
      const objects = await db.query(Filter.or(Filter.type(Map.Map), Filter.type(Markdown.Document))).run();
      await binder.bind({ objects: objects.map((object) => Ref.make(object)) });
    },
  }),
  args: {
    layout: [[StoryRole.Chat], [StoryRole.Context]],
  },
};

export const WithBoard: Story = {
  decorators: createDecorators({
    lazyPlugins: async () => {
      const [{ Board }, BoardPlugin] = await Promise.all([
        import('@dxos/plugin-board'),
        import('@dxos/plugin-board/BoardPlugin'),
      ]);
      return {
        plugins: [BoardPlugin.make()],
        types: [Board.Board],
      };
    },
    onInit: async ({ space }) => {
      const { Board } = await import('@dxos/plugin-board');
      space.db.add(Board.makeBoard());
    },
    onChatCreated: async ({ db, binder }) => {
      const { Board } = await import('@dxos/plugin-board');
      const objects = await db.query(Filter.type(Board.Board)).run();
      await binder.bind({ objects: objects.map((object) => Ref.make(object)) });
    },
  }),
  args: {
    layout: [[StoryRole.Chat], [StoryRole.Context]],
  },
};

/** The fact server the agent's memory is read from: `moon run plugin-discord:fact-server` over a crawl's facts DB. */
const FACT_SERVER_URL = String(import.meta.env.VITE_FACT_SERVER_URL ?? RemoteFactStorePlugin.DEFAULT_URL);

/**
 * Starts with only the agent and its memory: the Brain skill queries a fact store served over HTTP (e.g. the facts
 * extracted from a Discord crawl), and the sheet, presenter and markdown skills turn what it finds into artifacts —
 * sheets with charts, a deck of the charts and a summary — each shown in the artifacts panel as it is made. Nothing is
 * seeded: the findings are whatever the agent derives from the store. `autocue/findings-artifacts.mjs` prompts it.
 */
export const FromMemory: Story = {
  decorators: createDecorators({
    lazyPlugins: async () => {
      const [SheetPlugin, PresenterPlugin, MarkdownPlugin, SpacePlugin] = await Promise.all([
        import('@dxos/plugin-sheet/SheetPlugin'),
        import('@dxos/plugin-presenter/PresenterPlugin'),
        import('@dxos/plugin-markdown/MarkdownPlugin'),
        import('@dxos/plugin-space/SpacePlugin'),
      ]);
      return {
        // SpacePlugin handles `AddObject`, which the create operations of the artifact plugins file their objects with.
        plugins: [
          SheetPlugin.make(),
          PresenterPlugin.make(),
          MarkdownPlugin.make(),
          SpacePlugin.make({}),
          RemoteFactStorePlugin.make(FACT_SERVER_URL),
        ],
        types: [Sheet.Sheet, Sheet.Chart, Presentation.Presentation],
      };
    },
    skills: [AssistantSkill.key, BrainSkill.key, Sheet.SKILL_KEY, Presentation.SKILL_KEY, Markdown.SKILL_KEY],
  }),
  args: {
    layout: [[StoryRole.Chat], [StoryRole.Artifacts]],
  },
};
