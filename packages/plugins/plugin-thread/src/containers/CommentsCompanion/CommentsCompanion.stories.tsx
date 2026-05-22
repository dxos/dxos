//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useMemo } from 'react';

import { Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Surface } from '@dxos/app-framework/ui';
import { AppActivationEvents, AppCapabilities, AppPlugin, createObjectNode, getPersonalSpace } from '@dxos/app-toolkit';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Filter, Query, Relation } from '@dxos/echo';
import { AtomQuery } from '@dxos/echo-atom';
import { ClientCapabilities } from '@dxos/plugin-client';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { GraphBuilder, Node, NodeMatcher, qualifyId } from '@dxos/plugin-graph';
import { Markdown, MarkdownEvents } from '@dxos/plugin-markdown';
import { MarkdownPlugin } from '@dxos/plugin-markdown/plugin';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { random } from '@dxos/random';
import { useQuery, useSpaces } from '@dxos/react-client/echo';
import { useAttentionAttributes } from '@dxos/react-ui-attention';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import { AnchoredTo, Message, Thread } from '@dxos/types';
import { isNonNullable } from '@dxos/util';

import { translations } from '#translations';

import { ThreadPlugin } from '../../ThreadPlugin';

random.seed(1);

/**
 * Story-only plugin that exposes Markdown documents in the personal space as direct
 * children of the graph root, so ThreadPlugin's `comment-toolbar` extension can
 * attach the `comment` action to the doc's node.
 */
const StoryGraphPlugin = Plugin.define({ id: 'story-graph', name: 'Story Graph' }).pipe(
  AppPlugin.addAppGraphModule({
    activate: Effect.fnUntraced(function* () {
      const capabilities = yield* Capability.Service;
      const extensions = yield* GraphBuilder.createExtension({
        id: 'story-docs',
        match: NodeMatcher.whenRoot,
        connector: (_, get) =>
          Effect.gen(function* () {
            const client = capabilities.get(ClientCapabilities.Client);
            const space = getPersonalSpace(client);
            if (!space) {
              return [];
            }
            const docs = get(AtomQuery.make(space.db, Filter.type(Markdown.Document)));
            return docs
              .map((object) => createObjectNode({ db: space.db, object, droppable: false }))
              .filter(isNonNullable);
          }),
      });
      return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
    }),
  }),
  Plugin.make,
);

const DefaultStory = () => {
  const [space] = useSpaces();
  const [doc] = useQuery(space?.db, Query.type(Markdown.Document));
  const attendableId = doc && qualifyId(Node.RootId, doc.id);
  const attentionAttrs = useAttentionAttributes(attendableId);
  const articleData = useMemo(() => ({ subject: doc, attendableId: attendableId ?? 'story' }), [doc, attendableId]);
  const companionData = useMemo(
    () => ({ subject: 'comments', companionTo: doc, attendableId: attendableId ?? 'story' }),
    [doc, attendableId],
  );

  if (!doc) {
    return <Loading data={{ doc: !!doc }} />;
  }

  return (
    <div className='dx-container grid grid-cols-[3fr_2fr] gap-4' {...attentionAttrs}>
      <Surface.Surface type={AppSurface.Article} data={articleData} limit={1} />
      <Surface.Surface type={AppSurface.Article} data={companionData} limit={1} />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-thread/containers/CommentsCompanion',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      setupEvents: [AppActivationEvents.SetupSettings, MarkdownEvents.SetupExtensions],
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Markdown.Document, Text.Text, Thread.Thread, Message.Message, AnchoredTo.AnchoredTo],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client);

              const doc = personalSpace.db.add(
                Markdown.make({
                  name: 'Sample',
                  content: [
                    '# Sample',
                    '',
                    'This document has comment threads attached to it.',
                    '',
                    'Select text in the editor to add a new comment, or view existing threads in the companion.',
                    '',
                  ].join('\n'),
                }),
              );

              const thread = personalSpace.db.add(Thread.make());
              personalSpace.db.add(
                Relation.make(AnchoredTo.AnchoredTo, {
                  [Relation.Source]: thread,
                  [Relation.Target]: doc,
                }),
              );

              yield* Effect.promise(() => personalSpace.db.flush({ indexes: true }));
            }),
        }),
        SpacePlugin({}),
        MarkdownPlugin(),
        ThreadPlugin(),
        StoryGraphPlugin(),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
