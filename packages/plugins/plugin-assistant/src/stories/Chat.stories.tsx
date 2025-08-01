//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react-vite';
import React, { type FC } from 'react';

import { PLANNING_BLUEPRINT } from '@dxos/assistant-testing';
import { Obj } from '@dxos/echo';
import { Board, BoardPlugin } from '@dxos/plugin-board';
import { ChessPlugin } from '@dxos/plugin-chess';
import { ChessType } from '@dxos/plugin-chess/types';
import { InboxPlugin } from '@dxos/plugin-inbox';
import { MapPlugin } from '@dxos/plugin-map';
import { MarkdownPlugin } from '@dxos/plugin-markdown';
import { TablePlugin } from '@dxos/plugin-table';
import { useSpace } from '@dxos/react-client/echo';
import { mx } from '@dxos/react-ui-theme';
import { render } from '@dxos/storybook-utils';

import { translations } from '../translations';
import {
  BlueprintContainer,
  BoardContainer,
  ChatContainer,
  type ComponentProps,
  DocumentContainer,
  GraphContainer,
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
    config: remoteConfig,
    plugins: [MarkdownPlugin()],
  }),
  args: {
    components: [ChatContainer, DocumentContainer],
  },
} satisfies Story;

export const WithBlueprints = {
  decorators: getDecorators({
    plugins: [ChessPlugin(), InboxPlugin(), MapPlugin(), MarkdownPlugin(), TablePlugin()],
    blueprints: [PLANNING_BLUEPRINT],
    context: true,
    config: remoteConfig,
  }),
  args: {
    components: [ChatContainer, [DocumentContainer, BlueprintContainer]],
  },
} satisfies Story;

export const WithSearch = {
  decorators: getDecorators({
    context: true,
    config: remoteConfig,
    types: testTypes,
    onSpacesReady: async (_, client) => {
      const space = client.spaces.default;
      await addTestData(space);
    },
  }),
  args: {
    components: [ChatContainer, [GraphContainer]],
  },
} satisfies Story;

// TODO(burdon): Artifact surface (showing currently bound artifacts).
export const WithChess = {
  decorators: getDecorators({
    context: true,
    config: remoteConfig,
    types: [ChessType],
    onSpacesReady: async (_, client) => {
      const space = client.spaces.default;
      space.db.add(
        Obj.make(ChessType, {
          fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        }),
      );
    },
  }),
  args: {
    components: [ChatContainer],
  },
} satisfies Story;

export const WithBoard = {
  decorators: getDecorators({
    plugins: [BoardPlugin()],
    context: true,
    config: remoteConfig,
    types: [Board.Board],
    onSpacesReady: async (_, client) => {
      const space = client.spaces.default;
      space.db.add(Board.makeBoard());
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
    context: true,
    config: remoteConfig,
  }),
  args: {
    components: [ChatContainer, [GraphContainer, BlueprintContainer]],
  },
} satisfies Story;
