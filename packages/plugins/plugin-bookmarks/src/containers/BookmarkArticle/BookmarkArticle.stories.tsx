//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { Filter, Obj, Ref } from '@dxos/echo';
import { initializeIdentity, ClientPlugin } from '@dxos/plugin-client/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { Loading, withTheme } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import { trim } from '@dxos/util';

import { translations } from '#translations';
import { Bookmark } from '#types';

import { BookmarksPlugin } from '../../plugin';
import { BookmarkArticle } from './BookmarkArticle';

const DefaultStory = () => {
  const [space] = useSpaces();
  const [bookmark] = useQuery(space?.db, Filter.type(Bookmark.Bookmark));
  if (!bookmark) {
    return <Loading />;
  }

  return <BookmarkArticle role='article' attendableId='story' subject={bookmark} />;
};

const SUMMARY_CONTENT = trim`
  ## Summary

  - A short sample summary of the bookmarked page.
`;

const meta = {
  title: 'plugins/plugin-bookmarks/containers/BookmarkArticle',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withPluginManager({
      setupEvents: [AppActivationEvents.SetupSettings],
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Bookmark.Bookmark, Text.Text],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              yield* initializeIdentity(client);
              const [space] = client.spaces.get();
              yield* Effect.promise(() => space.waitUntilReady());
              const summary = space.db.add(Text.make({ content: SUMMARY_CONTENT }));
              const bookmark = space.db.add(
                Bookmark.make({
                  title: 'DXOS',
                  url: 'https://dxos.org',
                  excerpt: 'The decentralized operating system.',
                }),
              );
              Obj.update(bookmark, (bookmark) => {
                bookmark.summary = Ref.make(summary);
              });
              yield* Effect.promise(() => space.db.flush({ indexes: true }));
            }),
        }),
        BookmarksPlugin(),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
