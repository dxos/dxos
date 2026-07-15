//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useEffect, useMemo } from 'react';

import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Surface } from '@dxos/app-framework/ui';
import { AppActivationEvents, AppCapabilities, AppNode, AppPlugin, AppSpace, LayoutOperation } from '@dxos/app-toolkit';
import { AppSurface, useAppGraph } from '@dxos/app-toolkit/ui';
import { Operation, OperationHandlerSet } from '@dxos/compute';
import { Filter, Obj, Query, Ref, Relation } from '@dxos/echo';
import { toCursorRange } from '@dxos/echo-client';
import { Doc } from '@dxos/echo-doc';
import { DXN } from '@dxos/keys';
import { ClientCapabilities } from '@dxos/plugin-client';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { Graph, GraphBuilder, Node, NodeMatcher, qualifyId } from '@dxos/plugin-graph';
import { Markdown, MarkdownEvents } from '@dxos/plugin-markdown';
import { MarkdownPlugin } from '@dxos/plugin-markdown/testing';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { random } from '@dxos/random';
import { type Space, useQuery, useSpaces } from '@dxos/react-client/echo';
import { useAttentionAttributes } from '@dxos/react-ui-attention';
import { Loading, withLayout } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import { AnchoredTo, Message, Thread } from '@dxos/types';
import { isNonNullable } from '@dxos/util';

import { CommentsPlugin } from '../../CommentsPlugin';
import { translations } from '../../translations';
import { CommentsArticle } from './CommentsArticle';

random.seed(1);

const SAMPLE_CONTENT = [
  '# Sample',
  '',
  'This document is edited on the left and commented on the right.',
  '',
  'Comments are anchored to ranges of text using an Effect schema relation, so they survive edits to the surrounding prose.',
  '',
  'Both columns are bound to the same Markdown.Document, so selecting text here highlights the matching thread in the panel.',
  '',
  random.lorem.paragraphs(1),
  '',
  'Select text in the editor to add a new comment, or view existing threads in the panel on the right.',
  '',
  random.lorem.paragraphs(1),
  '',
].join('\n');

// Phrase in SAMPLE_CONTENT that the seeded comment thread is anchored to.
const SEED_PHRASE = 'Effect schema';

/**
 * Seed a single anchored comment thread over a known phrase so the editor renders the
 * highlighted range and the comments panel lists the thread.
 */
const seedComment = (space: Space, doc: Markdown.Document, text: Text.Text) => {
  const accessor = Doc.createAccessor(text, ['content']);
  const content = text.content;
  const start = content.indexOf(SEED_PHRASE);
  if (start < 0) {
    return;
  }

  const anchor = toCursorRange(accessor, start, start + SEED_PHRASE.length);
  const thread = Thread.make({
    name: SEED_PHRASE,
    status: 'active',
    messages: [
      Ref.make(
        Obj.make(Message.Message, {
          created: new Date().toISOString(),
          sender: { role: 'user', name: 'Alice' },
          blocks: [{ _tag: 'text', text: `Comment on “${SEED_PHRASE}”.` }],
        }),
      ),
    ],
  });
  const relation = Relation.make(AnchoredTo.AnchoredTo, {
    [Relation.Source]: thread,
    [Relation.Target]: doc,
    anchor,
  });
  space.db.add(thread);
  space.db.add(relation);
};

/**
 * Story-only plugin exposing Markdown documents in the personal space as direct children of
 * the graph root, so CommentsPlugin's `comment-toolbar` extension can attach the `comment`
 * action to the doc's node, and stubbing plugin-deck's layout operations (`UpdateCompanion`,
 * `ScrollIntoView`) that CommentsPlugin and CommentsArticle invoke.
 */
const StoryGraphPlugin = Plugin.define(
  Plugin.makeMeta({
    key: DXN.make('org.dxos.plugin.comments.story.markdownWithCommentsGraph'),
    name: 'Story Graph',
  }),
).pipe(
  AppPlugin.addAppGraphModule({
    activate: Effect.fnUntraced(function* () {
      const capabilities = yield* Capability.Service;
      const extensions = yield* GraphBuilder.createExtension({
        id: 'storyDocs',
        match: NodeMatcher.whenRoot,
        connector: (_, get) =>
          Effect.gen(function* () {
            const client = capabilities.get(ClientCapabilities.Client);
            const space = AppSpace.getPersonalSpace(client);
            if (!space) {
              return [];
            }
            const docs = get(space.db.query(Filter.type(Markdown.Document)).atom);
            return docs
              .map((object) => AppNode.makeObject({ get, db: space.db, object, droppable: false }))
              .filter(isNonNullable);
          }),
      });
      return Capability.contributes(AppCapabilities.AppGraphBuilder, extensions);
    }),
  }),
  AppPlugin.addOperationHandlerModule({
    activate: () =>
      Effect.succeed(
        Capability.contributes(
          Capabilities.OperationHandler,
          OperationHandlerSet.make(
            Operation.withHandler(LayoutOperation.UpdateCompanion, () => Effect.void),
            Operation.withHandler(LayoutOperation.ScrollIntoView, () => Effect.void),
          ),
        ),
      ),
  }),
  Plugin.make,
);

type StoryArgs = {
  /** Seed a single anchored comment thread over a known phrase in the document. */
  seedComment?: boolean;
};

const DefaultStory = ({ seedComment }: StoryArgs) => {
  const { graph } = useAppGraph();
  const [space] = useSpaces();
  const [doc] = useQuery(space?.db, Query.type(Markdown.Document));
  const attendableId = doc && qualifyId(Node.RootId, doc.id);
  const attentionAttrs = useAttentionAttributes(attendableId);

  // Story renders surfaces directly (no deck), so expand graph actions for the doc node.
  useEffect(() => {
    if (attendableId) {
      void Graph.expand(graph, attendableId, 'action');
    }
  }, [graph, attendableId]);

  const articleData = useMemo(() => ({ subject: doc, attendableId: attendableId ?? 'story' }), [doc, attendableId]);

  if (!doc) {
    return <Loading data={{ doc: !!doc, seedComment }} />;
  }

  return (
    <div className='dx-container grid grid-cols-2' {...attentionAttrs}>
      <Surface.Surface type={AppSurface.Article} data={articleData} limit={1} />
      <CommentsArticle subject={doc} attendableId={attendableId ?? 'story'} />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-comments/containers/MarkdownWithComments',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager<StoryArgs>(({ args }) => ({
      setupEvents: [AppActivationEvents.SetupSettings, MarkdownEvents.SetupExtensions],
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Markdown.Document, Text.Text, Thread.Thread, Message.Message, AnchoredTo.AnchoredTo],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client);
              const doc = Markdown.make({ name: 'Sample', content: SAMPLE_CONTENT });
              personalSpace.db.add(doc);
              yield* Effect.promise(() => personalSpace.db.flush({ indexes: true }));

              if (args.seedComment) {
                const text = yield* Effect.promise(() => doc.content.load());
                seedComment(personalSpace, doc, text);
                yield* Effect.promise(() => personalSpace.db.flush({ indexes: true }));
              }
            }),
        }),
        SpacePlugin({}),
        MarkdownPlugin(),
        StoryGraphPlugin(),
        CommentsPlugin(),
      ],
    })),
  ],
  parameters: {
    layout: 'fullscreen',
    controls: { disable: true },
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Both columns bound to the same Markdown.Document; no comment threads yet. */
export const Default: Story = {};

/** A single seeded comment thread anchored to a range in the text — exercises the highlighted
 * range in the editor and the thread rendered in the comments panel. */
export const WithComment: Story = {
  args: {
    seedComment: true,
  },
};
