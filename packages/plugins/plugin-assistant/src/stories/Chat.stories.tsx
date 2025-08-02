//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react-vite';
import React, { type FC } from 'react';

import { PLANNING_BLUEPRINT } from '@dxos/assistant-testing';
import { Board, BoardPlugin } from '@dxos/plugin-board';
import { ChessPlugin } from '@dxos/plugin-chess';
import { Chess } from '@dxos/plugin-chess/types';
import { InboxPlugin } from '@dxos/plugin-inbox';
import { MapPlugin } from '@dxos/plugin-map';
import { MarkdownPlugin } from '@dxos/plugin-markdown';
import { TablePlugin } from '@dxos/plugin-table';
import { useSpace } from '@dxos/react-client/echo';
import { mx } from '@dxos/react-ui-theme';
import { render } from '@dxos/storybook-utils';
import { Markdown } from '@dxos/plugin-markdown/types';
import { Ref } from '@dxos/echo';

import { translations } from '../translations';
import {
  BlueprintContainer,
  BoardContainer,
  ChatContainer,
  type ComponentProps,
  DocumentContainer,
  GraphContainer,
  SurfaceContainer,
} from './components';
import { addTestData, getDecorators, remoteConfig, testTypes } from './testing';

const DefaultStory = ({ components }: { components: (FC<ComponentProps> | FC<ComponentProps>[])[] }) => {
  const space = useSpace();
  if (!space) {
    return null;
  }

  return (
    <div
      className={mx('grid grid-cols gap-2 m-2')}
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
              <div key={index} className='flex flex-col overflow-hidden bg-baseSurface border border-separator'>
                <Component space={space} />
              </div>
            ))}
          </div>
        ) : (
          <div key={index} className='flex flex-col overflow-hidden bg-baseSurface border border-separator'>
            <Component space={space} />
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
    config: remoteConfig,
  }),
  args: {
    components: [ChatContainer],
  },
} satisfies Story;

export const WithDocument = {
  decorators: getDecorators({
    plugins: [MarkdownPlugin()],
    config: remoteConfig,
  }),
  args: {
    components: [ChatContainer, DocumentContainer],
  },
} satisfies Story;

export const WithBlueprints = {
  decorators: getDecorators({
    plugins: [ChessPlugin(), InboxPlugin(), MapPlugin(), MarkdownPlugin(), TablePlugin()],
    blueprints: [PLANNING_BLUEPRINT],
    config: remoteConfig,
    onInit: async ({ space, binder }) => {
      const object = space.db.add(Markdown.makeDocument({ name: 'Tasks' }));
      await binder.bind({ objects: [Ref.make(object)] });
    },
  }),
  args: {
    components: [ChatContainer, [DocumentContainer, BlueprintContainer]],
  },
} satisfies Story;

export const WithSearch = {
  decorators: getDecorators({
    config: remoteConfig,
    types: testTypes,
    onInit: async ({ space }) => {
      await addTestData(space);
    },
  }),
  args: {
    components: [ChatContainer, [GraphContainer]],
  },
} satisfies Story;

export const WithChess = {
  decorators: getDecorators({
    plugins: [ChessPlugin()],
    config: remoteConfig,
    types: [Chess.Game],
    onInit: async ({ space, binder }) => {
      // TODO(burdon): Add player IDs (for assistant).
      const object = space.db.add(
        Chess.makeGame({
          // name: 'Game',
          pgn: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 7. Nc3 d5 8. exd5 Nxd5 9. O-O Be6 10. Qb3 Na5 11. Qa4+ c6 12. Bxd5 Bxc3 13. Bxe6 fxe6 14. bxc3 *',
        }),
      );
      await binder.bind({ objects: [Ref.make(object)] });
    },
  }),
  args: {
    components: [ChatContainer, SurfaceContainer],
  },
} satisfies Story;

export const WithBoard = {
  decorators: getDecorators({
    plugins: [BoardPlugin()],
    config: remoteConfig,
    types: [Board.Board],
    onInit: async ({ space, binder }) => {
      const object = space.db.add(Board.makeBoard());
      await binder.bind({ objects: [Ref.make(object)] });
    },
  }),
  args: {
    components: [ChatContainer, BoardContainer],
  },
} satisfies Story;

export const WithResearch = {
  decorators: getDecorators({
    plugins: [MarkdownPlugin(), TablePlugin()],
    blueprints: [PLANNING_BLUEPRINT],
    config: remoteConfig,
  }),
  args: {
    components: [ChatContainer, [GraphContainer, BlueprintContainer]],
  },
} satisfies Story;
