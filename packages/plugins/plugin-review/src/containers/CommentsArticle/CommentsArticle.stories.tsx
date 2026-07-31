//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import React, { useEffect } from 'react';

import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { useCapability } from '@dxos/app-framework/ui';
import { AppCapabilities, AppNode, AppSpace, LayoutOperation } from '@dxos/app-toolkit';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import { Operation, OperationHandlerSet } from '@dxos/compute';
import { Filter, Obj, Query, Ref, Relation } from '@dxos/echo';
import { toCursorRange } from '@dxos/echo-client';
import { Doc } from '@dxos/echo-doc';
import { useQuery } from '@dxos/echo-react';
import { invariant } from '@dxos/invariant';
import { DXN } from '@dxos/keys';
import { ClientCapabilities } from '@dxos/plugin-client';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { Graph, GraphBuilder, Node, NodeMatcher, qualifyId } from '@dxos/plugin-graph';
import { Markdown, MarkdownCapabilities } from '@dxos/plugin-markdown';
import { MarkdownPlugin } from '@dxos/plugin-markdown/testing';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { type Space, useSpaces } from '@dxos/react-client/echo';
import { withLayout } from '@dxos/react-ui/testing';
import { Text } from '@dxos/schema';
import { AnchoredTo, Message, Thread } from '@dxos/types';
import { isNonNullable } from '@dxos/util';

import { ReviewPlugin, type ReviewPluginOptions } from '../../ReviewPlugin';
import { textOf } from '../../should-trigger-agent';
import { ReviewStoryLayout, SAMPLE_CONTENT, STORY_AGENT_NAME, seedAgentSuggestions } from '../../testing';
import { translations } from '../../translations';
import { AgentIdentity, CommentCapabilities } from '../../types';

// Phrases in SAMPLE_CONTENT that the seeded comment threads are anchored to.
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
    const thread = space.db.add(
      Thread.make({
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
      }),
    );
    space.db.add(
      Relation.make(AnchoredTo.AnchoredTo, {
        [Relation.Source]: thread,
        [Relation.Target]: doc,
        anchor,
      }),
    );
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
 *    graph root, so ReviewPlugin's `comment-toolbar` extension can attach the
 *    `comment` action to the doc's node.
 * 2. Stubs out plugin-deck's layout operations (`UpdateCompanion`,
 *    `ScrollIntoView`) that ReviewPlugin and the CommentsArticle invoke.
 */
const StoryAppGraphBuilder = Capability.inlineModule(
  'StoryAppGraphBuilder',
  { provides: [AppCapabilities.AppGraphBuilder] },
  Effect.fnUntraced(function* () {
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
    return [Capability.contribute(AppCapabilities.AppGraphBuilder, extensions)];
  }),
);

const StoryOperationHandler = Capability.inlineModule(
  'StoryOperationHandler',
  { provides: [Capabilities.OperationHandler] },
  () =>
    Effect.succeed([
      Capability.contribute(
        Capabilities.OperationHandler,
        OperationHandlerSet.make(
          Operation.withHandler(LayoutOperation.UpdateCompanion, () => Effect.void),
          Operation.withHandler(LayoutOperation.ScrollIntoView, () => Effect.void),
        ),
      ),
    ]),
);

const StoryGraphPlugin = Plugin.define(
  Plugin.makeMeta({
    key: DXN.make('org.dxos.plugin.comments.story.storyGraph'),
    name: 'Story Graph',
  }),
).pipe(Plugin.addModule(StoryAppGraphBuilder), Plugin.addModule(StoryOperationHandler), Plugin.make);

type StoryArgs = {
  /**
   * Sets the Markdown plugin's `commentAgentMode` setting so newly-created
   * comment threads on the seeded doc are stamped with the matching agent
   * config by CommentOperation.Create.
   */
  agentMode?: Markdown.Settings['commentAgentMode'];
  /** Seed three anchored comment threads over known phrases in the document. */
  seedComments?: boolean;
  /** Seed a suggestion branch authored by the story agent (deterministic; no LLM). */
  seedAgentSuggestions?: boolean;
};

const DefaultStory = ({ agentMode }: StoryArgs) => {
  const { graph } = useAppGraph();
  const [space] = useSpaces();
  const [doc] = useQuery(space?.db, Query.type(Markdown.Document));
  const attendableId = doc && qualifyId(Node.RootId, doc.id);

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

  return <ReviewStoryLayout attendableId={attendableId} />;
};

const meta = {
  title: 'plugins/plugin-review/containers/CommentsArticle',
  render: DefaultStory,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager<StoryArgs>(({ args }) => ({
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Markdown.Document, Text.Text, Thread.Thread, Message.Message, AnchoredTo.AnchoredTo],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client, { displayName: 'Alice Mercer' });
              const doc = Markdown.make({ name: 'Sample', content: SAMPLE_CONTENT });
              personalSpace.db.add(doc);
              yield* Effect.promise(() => personalSpace.db.flush({ indexes: true }));

              if (args.seedComments) {
                const text = yield* Effect.promise(() => doc.content.load());
                seedComments(personalSpace, doc, text);
                yield* Effect.promise(() => personalSpace.db.flush({ indexes: true }));
              }

              if (args.seedAgentSuggestions) {
                const text = yield* Effect.promise(() => doc.content.load());
                invariant(text, 'document content not loaded');
                yield* Effect.promise(() => seedAgentSuggestions(doc, text));
                yield* Effect.promise(() => personalSpace.db.flush({ indexes: true }));
              }
            }),
        }),
        SpacePlugin({}),
        ReviewPlugin({
          agentRunner: StubAgentRunner,
          agentIdentity: { name: STORY_AGENT_NAME },
        } satisfies ReviewPluginOptions),
        MarkdownPlugin(),
        StoryGraphPlugin(),
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

/**
 * Baseline:
 * - Document article on the left, the comments companion on the right (history companion below it).
 * - No seeded comments or suggestions; empty-state review surface.
 *
 * Test:
 * - Select text in the doc; click Add comment; type + Enter: thread appears, anchor label = selection, highlight in doc.
 * - Add a second comment on another range; both threads listed in document order.
 * - Delete a thread (thread menu): highlight clears from the editor.
 * - Click a thread card: editor scrolls and the anchored range highlights (active state).
 */
export const Default: Story = {};

/**
 * AI comment agent in `mention` mode:
 * - The thread is opted into the agent.
 * - Type `@Kai …` in the comment input to trigger the stub runner.
 * - Plain (non-mention) messages are ignored.
 *
 * Test:
 * 1. Post `@Kai hello`: stub agent replies; plain message: no reply.
 */
export const WithMentionAgent: Story = {
  args: {
    agentMode: 'mention',
  },
};

/**
 * AI comment agent in `auto` mode:
 * - The thread is opted into the agent.
 * - Every user message triggers the stub runner.
 * - The runner appends a canned echo reply.
 *
 * Test:
 * - Post any message: canned echo reply appears on the thread.
 */
export const WithAutoAgent: Story = {
  args: {
    agentMode: 'auto',
  },
};

/**
 * Existing comment threads:
 * - A larger, multi-paragraph document seeded with three anchored comment threads.
 * - Exercises snippet rendering in the companion.
 * - Exercises the companion ↔ editor selection sync.
 *
 * Test:
 * - Click each seeded thread: editor scrolls + range highlights; click in doc on a highlight: thread activates.
 * - Add a new comment mid-doc; delete it; highlights stay consistent.
 */
export const WithComments: Story = {
  args: {
    seedComments: true,
  },
};

/**
 * Integrated ambient review demo (two agent authors, deterministic — no LLM):
 * - Each of "Kai" and "Nova" has a per-author `kind:'suggestion'` branch proposing reworded sentences.
 * - Editor (main): both authors' changes overlay inline, colour-coded per author.
 * - Right column: comments companion (top) + history companion (below).
 * - Companion: one accept/reject change-block card per grouped change, avatar tinted by author hue.
 *
 * Test:
 * - Accept one change-block: text folds into doc, card resolves; Reject another: text reverts.
 * - Author hue consistent across card avatar and inline marker.
 */
export const WithAgentSuggestions: Story = {
  args: {
    seedAgentSuggestions: true,
  },
};

/**
 * Comments AND suggestions over the same document — the app condition for the comment-click bug.
 * Use it to check whether clicking a comment is still detected (watch for the `comment selected` log)
 * when the suggestion overlay is layered over the text; if detection works in `WithComments` but not
 * here, the suggestion overlay is intercepting the click.
 *
 * Test:
 * - Click a comment highlight UNDER the suggestion overlay: thread activates (overlay must not eat the click).
 * - Add + delete a comment while suggestions are visible; both layers stay correct.
 */
export const WithCommentsAndSuggestions: Story = {
  args: {
    seedComments: true,
    seedAgentSuggestions: true,
  },
};
