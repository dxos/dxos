//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useEffect, useMemo } from 'react';

import { ActivationEvents, Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Surface, useCapability } from '@dxos/app-framework/ui';
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
import { Markdown, MarkdownCapabilities, MarkdownEvents } from '@dxos/plugin-markdown';
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
import { textOf } from '../../should-trigger-agent';
import { translations } from '../../translations';
import { AgentIdentity, CommentCapabilities } from '../../types';

random.seed(1);

const STORY_AGENT_NAME = 'Kai';

const SAMPLE_CONTENT = [
  '# Sample',
  '',
  'This document has comment threads attached to it.',
  '',
  'Comments are anchored to ranges of text using an Effect schema relation, so they survive edits to the surrounding prose.',
  '',
  'The companion renders each thread on a virtual stack, mirroring the chat experience while keeping the editor in sync.',
  '',
  random.lorem.paragraphs(1),
  '',
  'Select text in the editor to add a new comment, or view existing threads in the companion.',
  '',
  random.lorem.paragraphs(1),
  '',
].join('\n');

// Phrases in LARGE_CONTENT that the seeded comment threads are anchored to.
const SEED_PHRASES = ['comment threads', 'Effect schema', 'virtual stack'];

/**
 * Seed anchored comment threads over known phrases so the editor renders the
 * highlighted ranges and the companion lists the threads (with snippets).
 */
const seedComments = (space: Space, doc: Markdown.Document, text: Text.Text) => {
  const accessor = Doc.createAccessor(text, ['content']);
  const content = text.content;
  for (const phrase of SEED_PHRASES) {
    const start = content.indexOf(phrase);
    if (start < 0) {
      continue;
    }
    const anchor = toCursorRange(accessor, start, start + phrase.length);
    const thread = Thread.make({
      name: phrase,
      status: 'active',
      messages: [
        Ref.make(
          Obj.make(Message.Message, {
            created: new Date().toISOString(),
            sender: { role: 'user', name: 'Alice' },
            blocks: [{ _tag: 'text', text: `Comment on “${phrase}”.` }],
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
  }
};

/**
 * Canned echo runner — never makes network calls. On each turn finds the
 * last non-assistant message and appends an assistant message that quotes it.
 * Used by the WithMentionAgent / WithAutoAgent variants.
 */
const StubAgentRunner: CommentCapabilities.AgentRunner = {
  run: ({ thread }) =>
    Effect.gen(function* () {
      const identity = yield* Capability.get(AgentIdentity);
      // User-authored messages have no role set; only assistant messages do.
      const lastUser = [...thread.messages].reverse().find((ref) => ref.target?.sender.role !== 'assistant');
      const echoText = textOf(lastUser?.target);
      const reply = Obj.make(Message.Message, {
        created: new Date().toISOString(),
        sender: { role: 'assistant', name: identity.name, identityDid: identity.identityDid },
        blocks: [{ _tag: 'text', text: `(${identity.name}) you said: "${echoText}"` }],
      });
      Obj.update(thread, (thread) => {
        (thread.messages as Ref.Ref<Message.Message>[]).push(Ref.make(reply));
      });
    }),
};

/**
 * Common story-only plugin:
 * 1. Exposes Markdown documents in the personal space as direct children of the
 *    graph root, so CommentsPlugin's `comment-toolbar` extension can attach the
 *    `comment` action to the doc's node.
 * 2. Stubs out plugin-deck's layout operations (`UpdateCompanion`,
 *    `ScrollIntoView`) that CommentsPlugin and the CommentsArticle invoke.
 * 3. Contributes a static `AgentIdentity` ("Kai") so any AgentRunner has a name
 *    to stamp on assistant messages.
 */
const StoryGraphPlugin = Plugin.define(
  Plugin.makeMeta({
    key: DXN.make('org.dxos.plugin.comments.story.storyGraph'),
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
  Plugin.addModule({
    id: 'story-graph.identity',
    activatesOn: ActivationEvents.Startup,
    activate: () => Effect.succeed(Capability.contributes(AgentIdentity, { name: STORY_AGENT_NAME })),
  }),
  Plugin.make,
);

/**
 * Stub agent runner — used by the WithMentionAgent / WithAutoAgent variants.
 * Loaded BEFORE CommentsPlugin so its `AgentRunner` contribution wins over
 * CommentsPlugin's default LLM-backed runner.
 */
const StoryStubAgentPlugin = Plugin.define(
  Plugin.makeMeta({
    key: DXN.make('org.dxos.plugin.comments.story.storyStubAgent'),
    name: 'Story Stub Agent',
  }),
).pipe(
  Plugin.addModule({
    id: 'story-stub-agent.runner',
    activatesOn: ActivationEvents.Startup,
    activate: () => Effect.succeed(Capability.contributes(CommentCapabilities.AgentRunner, StubAgentRunner)),
  }),
  Plugin.make,
);

type StoryArgs = {
  /**
   * Sets the Markdown plugin's `commentAgentMode` setting so newly-created
   * comment threads on the seeded doc are stamped with the matching agent
   * config by CommentOperation.Create.
   */
  agentMode?: Markdown.Settings['commentAgentMode'];
  /** Seed three anchored comment threads over known phrases in the document. */
  seedComments?: boolean;
};

const DefaultStory = ({ agentMode }: StoryArgs) => {
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

  // Push the variant's `agentMode` into the markdown plugin settings so that
  // CommentOperation.Create stamps new threads with the matching agent config.
  const markdownSettings = useCapability(MarkdownCapabilities.Settings);
  const registry = useCapability(Capabilities.AtomRegistry);
  useEffect(() => {
    if (!markdownSettings) {
      return;
    }
    registry.set(markdownSettings, { ...registry.get(markdownSettings), commentAgentMode: agentMode ?? 'off' });
  }, [markdownSettings, registry, agentMode]);

  const articleData = useMemo(() => ({ subject: doc, attendableId: attendableId ?? 'story' }), [doc, attendableId]);
  const companionData = useMemo(
    () => ({
      subject: 'comments',
      companionTo: doc,
      attendableId: attendableId ?? 'story',
    }),
    [doc, attendableId],
  );

  if (!doc) {
    return <Loading data={{ doc: !!doc }} />;
  }

  return (
    <div className='dx-container grid grid-cols-[3fr_2fr]' {...attentionAttrs}>
      <Surface.Surface type={AppSurface.Article} data={articleData} limit={1} />
      <Surface.Surface type={AppSurface.Article} data={companionData} limit={1} />
    </div>
  );
};

const meta = {
  title: 'plugins/plugin-comments/containers/CommentsArticle',
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

              if (args.seedComments) {
                const text = yield* Effect.promise(() => doc.content.load());
                seedComments(personalSpace, doc, text);
                yield* Effect.promise(() => personalSpace.db.flush({ indexes: true }));
              }
            }),
        }),
        SpacePlugin({}),
        MarkdownPlugin(),
        StoryGraphPlugin(),
        // The stub agent plugin must come BEFORE CommentsPlugin so its
        // `AgentRunner` contribution wins over CommentsPlugin's default
        // (LLM-backed) runner — `Capability.get` returns the first match.
        StoryStubAgentPlugin(),
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

export const Default: Story = {};

/**
 * Thread opted in to the AI agent in `mention` mode.
 * Type `@Kai …` in the comment input to trigger the stub runner; plain messages are ignored.
 */
export const WithMentionAgent: Story = {
  args: {
    agentMode: 'mention',
  },
};

/**
 * Thread opted in to the AI agent in `auto` mode.
 * Each user message triggers the stub runner, which appends a canned echo reply.
 */
export const WithAutoAgent: Story = {
  args: {
    agentMode: 'auto',
  },
};

/**
 * A larger, multi-paragraph document seeded with three existing comment threads
 * anchored to ranges in the text — exercises snippet rendering and the
 * companion ↔ editor selection sync.
 */
export const WithComments: Story = {
  args: {
    seedComments: true,
  },
};
