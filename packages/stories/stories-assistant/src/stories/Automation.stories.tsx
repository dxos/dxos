//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { RunInstructions, WebSearchSkill } from '@dxos/assistant-toolkit';
import { Instructions, Operation, Trigger } from '@dxos/compute';
import { Reply } from '@dxos/compute/testing';
import { Filter, Query, Ref } from '@dxos/echo';
import { ChessOperation } from '@dxos/plugin-chess';
import { Text } from '@dxos/schema';

import { Module, ModuleContainer, config, createDecorators } from '../testing';
import { storyDecorators, storyParameters } from './meta';

const meta: Meta<typeof ModuleContainer> = {
  title: 'stories/stories-assistant/Automation',
  render: ModuleContainer,
  decorators: storyDecorators,
  parameters: storyParameters,
};

export default meta;

type Story = StoryObj<typeof meta>;

export const WithTriggers: Story = {
  decorators: createDecorators({
    plugins: [],
    config: config.remote,
    onInit: async ({ space }) => {
      space.db.add(
        Trigger.make({
          runnable: Ref.make(Operation.serialize(Reply)),
          enabled: true,
          spec: Trigger.specTimer('*/5 * * * * *'), // Every 5 seconds.
        }),
      );
    },
  }),
  args: {
    layout: [[Module.Chat], [Module.Triggers, Module.Invocations]],
    skills: [],
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
    config: config.remote,
    onInit: async ({ space }) => {
      const [{ Chess }, { Game }] = await Promise.all([import('@dxos/plugin-chess'), import('@dxos/plugin-game')]);
      // TODO(burdon): Add player DID (for user and assistant).
      space.db.add(
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
    },
  }),
  args: {
    layout: [[Module.Chess], [Module.Triggers, Module.Invocations]],
    skills: [],
  },
};

export const WithPrompt: Story = {
  decorators: createDecorators({
    lazyPlugins: async () => {
      const { MarkdownPlugin } = await import('@dxos/plugin-markdown/plugin');
      return {
        plugins: [MarkdownPlugin()],
      };
    },
    config: config.remote,
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
    layout: [[Module.Routine], [Module.Invocations]],
  },
};
