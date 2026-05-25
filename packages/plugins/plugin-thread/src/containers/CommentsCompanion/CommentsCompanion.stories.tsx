//
// Copyright 2024 DXOS.org
//

import * as AnthropicClient from '@effect/ai-anthropic/AnthropicClient';
import * as FetchHttpClient from '@effect/platform/FetchHttpClient';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import React, { useEffect, useMemo } from 'react';

import { AiModelResolver } from '@dxos/ai';
import { AnthropicResolver } from '@dxos/ai/resolvers';
import { ActivationEvents, Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Surface, useCapability } from '@dxos/app-framework/ui';
import {
  AppActivationEvents,
  AppCapabilities,
  AppPlugin,
  LayoutOperation,
  createObjectNode,
  getPersonalSpace,
} from '@dxos/app-toolkit';
import { AppSurface, useAppGraph } from '@dxos/app-toolkit/ui';
import { Operation, OperationHandlerSet } from '@dxos/compute';
import { Filter, Obj, Query, Ref } from '@dxos/echo';
import { AtomQuery } from '@dxos/echo-atom';
import { ClientCapabilities } from '@dxos/plugin-client';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { Graph, GraphBuilder, Node, NodeMatcher, qualifyId } from '@dxos/plugin-graph';
import { Markdown, MarkdownCapabilities, MarkdownEvents } from '@dxos/plugin-markdown';
import { MarkdownPlugin } from '@dxos/plugin-markdown/testing';
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

import { textOf } from '../../should-trigger-agent';
import { ThreadPlugin } from '../../ThreadPlugin';
import { AgentIdentity, ThreadCapabilities } from '../../types';

random.seed(1);

const STORY_AGENT_NAME = 'Kai';

/**
 * Canned echo runner — never makes network calls. On each turn finds the
 * last non-assistant message and appends an assistant message that quotes it.
 * Used by the WithMentionAgent / WithAutoAgent variants.
 */
const StubAgentRunner: ThreadCapabilities.AgentRunner = {
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
 * Live `AppCapabilities.AiServiceLayer` wired through the DXOS edge so
 * `ThreadPlugin`'s default `AgentRunner` can call Claude. The edge endpoint is
 * open in dev — no API key is needed for the storybook to round-trip a real
 * LLM response. Used by the WithLiveAgent variant.
 *
 * Headless `test-storybook` runs render the story but don't submit a comment,
 * so no network call is made there either.
 */
const anthropicResolverLayer = AnthropicResolver.make().pipe(
  Layer.provide(
    AnthropicClient.layer({
      apiUrl: 'https://ai-service.dxos.workers.dev/provider/anthropic',
    }),
  ),
  Layer.provide(FetchHttpClient.layer),
);

const aiServiceLayer = AiModelResolver.AiModelResolver.buildAiService.pipe(
  Layer.provide(
    anthropicResolverLayer.pipe(
      Layer.provide(AiModelResolver.AiModelResolver.fromModelMap({ name: 'Fallback' }, Effect.succeed({}))),
    ),
  ),
);

/**
 * Common story-only plugin:
 * 1. Exposes Markdown documents in the personal space as direct children of the
 *    graph root, so ThreadPlugin's `comment-toolbar` extension can attach the
 *    `comment` action to the doc's node.
 * 2. Stubs out plugin-deck's layout operations (`UpdateCompanion`,
 *    `ScrollIntoView`) that ThreadPlugin and the CommentsCompanion invoke —
 *    no handler errors otherwise.
 * 3. Contributes a static `AgentIdentity` ("Kai") so any AgentRunner has a name
 *    to stamp on assistant messages.
 *
 * Agent runner / LLM hookup is contributed separately by `StoryStubAgentPlugin`
 * (no network) or `StoryLiveAgentPlugin` (real Anthropic via DXOS edge),
 * selected per-story via the `liveAgent` arg.
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
 * Loaded BEFORE ThreadPlugin so its `AgentRunner` contribution wins over
 * ThreadPlugin's default LLM-backed runner.
 */
const StoryStubAgentPlugin = Plugin.define({ id: 'story-stub-agent', name: 'Story Stub Agent' }).pipe(
  Plugin.addModule({
    id: 'story-stub-agent.runner',
    activatesOn: ActivationEvents.Startup,
    activate: () => Effect.succeed(Capability.contributes(ThreadCapabilities.AgentRunner, StubAgentRunner)),
  }),
  Plugin.make,
);

/**
 * Live agent runner hookup — contributes `AppCapabilities.AiServiceLayer` so
 * ThreadPlugin's default `AgentRunner` routes through Anthropic via the DXOS
 * edge. Used by the WithLiveAgent variant.
 */
const StoryLiveAgentPlugin = Plugin.define({ id: 'story-live-agent', name: 'Story Live Agent' }).pipe(
  Plugin.addModule({
    id: 'story-live-agent.ai-service',
    activatesOn: ActivationEvents.Startup,
    activate: () => Effect.succeed(Capability.contributes(AppCapabilities.AiServiceLayer, aiServiceLayer)),
  }),
  Plugin.make,
);

type StoryArgs = {
  /**
   * Sets the Markdown plugin's `commentAgentMode` setting so newly-created
   * comment threads on the seeded doc are stamped with the matching agent
   * config by ThreadOperation.Create.
   */
  agentMode?: Markdown.Settings['commentAgentMode'];

  /**
   * When true, contributes a live `AiServiceLayer` (Anthropic via DXOS edge)
   * so ThreadPlugin's default `AgentRunner` makes a real LLM call.
   * Defaults to `false` — variants use the stub echo runner.
   */
  liveAgent?: boolean;
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
  // ThreadOperation.Create stamps new threads with the matching agent config.
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
    withPluginManager<StoryArgs>((context) => ({
      setupEvents: [AppActivationEvents.SetupSettings, MarkdownEvents.SetupExtensions],
      plugins: [
        ...corePlugins(),
        ClientPlugin({
          types: [Markdown.Document, Text.Text, Thread.Thread, Message.Message, AnchoredTo.AnchoredTo],
          onClientInitialized: ({ client }) =>
            Effect.gen(function* () {
              const { personalSpace } = yield* initializeIdentity(client);
              personalSpace.db.add(
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

              yield* Effect.promise(() => personalSpace.db.flush({ indexes: true }));
            }),
        }),
        SpacePlugin({}),
        MarkdownPlugin(),
        StoryGraphPlugin(),
        // The stub agent plugin must come BEFORE ThreadPlugin so its
        // `AgentRunner` contribution wins over ThreadPlugin's default
        // (LLM-backed) runner — `Capability.get` returns the first match.
        // The live variant simply doesn't contribute a stub, letting the
        // default runner reach Anthropic via the AiServiceLayer.
        ...(context.args.liveAgent ? [] : [StoryStubAgentPlugin()]),
        ThreadPlugin(),
        ...(context.args.liveAgent ? [StoryLiveAgentPlugin()] : []),
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
 * Thread opted in to the AI agent in `auto` mode with the LIVE runner —
 * ThreadPlugin's default `AgentRunner` calls Anthropic Claude via the DXOS
 * edge proxy. Each user message triggers a real LLM response.
 *
 * Note: headless `test-storybook` only renders the story (no comment is
 * submitted) so this variant does not make a network call in CI.
 */
export const WithLiveAgent: Story = {
  args: {
    agentMode: 'auto',
    liveAgent: true,
  },
};
