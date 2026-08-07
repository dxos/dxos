//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { AppSurface } from '@dxos/app-toolkit/ui';
import { RunInstructions, WebSearchSkill } from '@dxos/assistant-toolkit';
import * as Instructions from '@dxos/compute/Instructions';
import * as Operation from '@dxos/compute/Operation';
import { Reply } from '@dxos/compute/testing';
import * as Trigger from '@dxos/compute/Trigger';
import { Filter, Query, Ref } from '@dxos/echo';
import * as ChessOperation from '@dxos/plugin-chess/ChessOperation';
import { meta as automationMeta } from '@dxos/plugin-routine';
import { Text } from '@dxos/schema';
import { Cell } from '@dxos/storybook-testing';

import { StoryRole } from '../modules';
import { ModuleContainer, addToRootCollection, createDecorators, storyParameters } from '../testing';
const meta: Meta<typeof ModuleContainer> = {
  title: 'stories/stories-assistant/Automation',
  render: ModuleContainer,
  parameters: storyParameters,
};

export default meta;

type Story = StoryObj<typeof meta>;

export const WithTriggers: Story = {
  decorators: createDecorators({
    plugins: [],
    onInit: async ({ space }) => {
      space.db.add(
        Trigger.make({
          runnable: Ref.make(Operation.serialize(Reply)),
          enabled: true,
          spec: Trigger.specTimer('*/5 * * * * *'), // Every 5 seconds.
        }),
      );
    },
    skills: [],
  }),
  args: {
    layout: [
      [StoryRole.Chat],
      [
        { type: AppSurface.Article, data: { subject: `${automationMeta.profile.key}.space-settings-automation` } },
        StoryRole.Invocations,
      ],
    ],
  },
};

export const WithChessTrigger: Story = {
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
        types: [Game.Game, Chess.State],
      };
    },
    onInit: async ({ space }) => {
      const [{ Chess }, { Game }] = await Promise.all([import('@dxos/plugin-chess'), import('@dxos/plugin-game')]);
      // TODO(burdon): Add player DID (for user and assistant).
      const game = space.db.add(
        Game.make({
          name: 'Challenge',
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
      addToRootCollection(space, [game]);
      space.db.add(
        Trigger.make({
          runnable: Ref.make(Operation.serialize(ChessOperation.Play)),
          enabled: true,
          spec: Trigger.specSubscription(Query.select(Filter.type(Game.Game))),
          input: {
            id: '{{event.changedObjectId}}',
            side: 'black', // NOTE: Removing it makes the bot play itself.
          },
        }),
      );
      return [
        [Cell.article(game)],
        [
          { type: AppSurface.Article, data: { subject: `${automationMeta.profile.key}.space-settings-automation` } },
          StoryRole.Invocations,
        ],
      ];
    },
    skills: [],
  }),
};

export const WithPrompt: Story = {
  decorators: createDecorators({
    lazyPlugins: async () => {
      const { MarkdownPlugin } = await import('@dxos/plugin-markdown/plugin');
      return {
        plugins: [MarkdownPlugin()],
      };
    },
    types: [Text.Text],
    onInit: async ({ space }) => {
      space.db.add(Operation.serialize(RunInstructions));
      space.db.add(
        Instructions.make({
          name: 'Research',
          description: 'Research organization',
          text: 'Research the organization provided as input. Absolutely, in all cases, create a research note for it at the end. NOTE: Do mocked reseach (set mockSearch to true).',
          skills: [Ref.make(WebSearchSkill.make())],
        }),
      );

      await space.db.flush();
    },
  }),
  args: {
    layout: [[StoryRole.Routine], [StoryRole.Invocations]],
  },
};
