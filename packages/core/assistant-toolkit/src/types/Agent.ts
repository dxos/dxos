//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Schema from 'effect/Schema';

import { AiContextBinder, AiContextService } from '@dxos/assistant';
import { type Blueprint } from '@dxos/blueprints';
import { Annotation, Database, Feed, Obj, Ref, Relation, Type } from '@dxos/echo';
import { Queue } from '@dxos/echo-db';
import { type ObjectNotFoundError } from '@dxos/echo/Err';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/internal';
import { acquireReleaseResource } from '@dxos/effect';
import { QueueService } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { QueueAnnotation, Text } from '@dxos/schema';

import * as Chat from './Chat';
import * as Plan from './Plan';

/**
 * Agent schema definition.
 */
export const Agent = Schema.Struct({
  name: Schema.optional(Schema.String),
  spec: Ref.Ref(Text.Text).pipe(FormInputAnnotation.set(false)),
  plan: Ref.Ref(Plan.Plan).pipe(FormInputAnnotation.set(false)),
  artifacts: Schema.Array(
    Schema.Struct({
      // TODO(dmaretskyi): Consider gettings names from the artifact itself using Obj.getLabel.
      name: Schema.String,
      data: Ref.Ref(Obj.Unknown),
    }),
  ).pipe(FormInputAnnotation.set(false)),

  /**
   * Incoming queue that the agent processes.
   */
  // NOTE: Named `queue` to conform to subscribable schema (see QueueAnnotation).
  queue: Schema.optional(Ref.Ref(Queue).pipe(FormInputAnnotation.set(false))),

  // TODO(dmaretskyi): Multiple chats.
  chat: Schema.optional(Ref.Ref(Chat.Chat).pipe(FormInputAnnotation.set(false))),

  /**
   * References to objects with a canonical queue property.
   * Schema must have the QueueAnnotation.
   */
  // TODO(dmaretskyi): Turn into an array of objects when form-data
  subscriptions: Schema.Array(Ref.Ref(Obj.Unknown)).pipe(FormInputAnnotation.set(false)),

  // TODO(burdon): Rename?
  useQualifyingAgent: Schema.optional(Schema.Boolean).annotations({
    title: 'Use qualifying agent on subscriptions',
    description:
      'If enabled, the qualifying agent will be used to determine if the event is relevant to the agent. Related events will be added to the input queue of the agent. It is recommended to enable this.',
  }),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.agent',
    version: '0.1.0',
  }),
  LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({
    icon: 'ph--circuitry--regular',
    hue: 'sky',
  }),
  QueueAnnotation.set(true),
);

export interface Agent extends Schema.Schema.Type<typeof Agent> {}

/**
 * Creates a fully initialized Agent with chat, queue, and context bindings.
 *
 * @param props - Agent properties including spec, plan, blueprints, and context objects.
 * @param blueprint - The blueprint to use for the agent context.
 * @returns An Effect that yields the initialized Agent.
 */
export const makeInitialized = (
  props: Omit<Obj.MakeProps<typeof Agent>, 'spec' | 'plan' | 'artifacts' | 'subscriptions' | 'chat'> &
    Partial<Pick<Obj.MakeProps<typeof Agent>, 'artifacts' | 'subscriptions'>> & {
      spec: string;
      blueprints?: Ref.Ref<Blueprint.Blueprint>[];
      contextObjects?: Ref.Ref<Obj.Any>[];
    },
  blueprint: Blueprint.Blueprint,
): Effect.Effect<Agent, never, QueueService | Feed.FeedService | Database.Service> =>
  Effect.gen(function* () {
    const agent = Obj.make(Agent, {
      ...props,
      spec: Ref.make(Text.make(props.spec)),
      plan: Ref.make(Plan.makePlan({ tasks: [] })),
      artifacts: props.artifacts ?? [],
      subscriptions: props.subscriptions ?? [],
      useQualifyingAgent: props.useQualifyingAgent ?? true,
    });
    yield* Database.add(agent);
    const feed = yield* Database.add(Feed.make());
    const runtime = yield* Effect.runtime<Feed.FeedService>();
    const contextBinder = new AiContextBinder({ feed, runtime });
    // TODO(dmaretskyi): Blueprint registry.
    const agentBlueprint = yield* Database.add(Obj.clone(blueprint, { deep: true }));
    yield* Effect.promise(() =>
      contextBinder.bind({
        blueprints: [Ref.make(agentBlueprint), ...(props.blueprints ?? [])],
        objects: [Ref.make(agent), ...(props.contextObjects ?? [])],
      }),
    );
    const chat = yield* Database.add(
      Chat.make({
        [Obj.Parent]: agent,
        feed: Ref.make(feed),
      }),
    );
    Obj.setParent(feed, chat);
    yield* Database.add(
      Relation.make(Chat.CompanionTo, {
        [Relation.Source]: chat,
        [Relation.Target]: agent,
      }),
    );

    const inputQueue = yield* QueueService.createQueue();

    Obj.change(agent, (agent) => {
      agent.chat = Ref.make(chat);
      agent.queue = Ref.fromDXN(inputQueue.dxn);
    });

    return agent;
  });

/**
 * Resets the agent chat history by rebuilding the chat context.
 * Preserves the existing blueprints and objects from the current chat context.
 *
 * @param agent - The agent whose chat history should be reset. Must have an existing chat.
 * @returns An Effect that resets the chat history.
 */
export const resetChatHistory = (
  agent: Agent,
): Effect.Effect<void, ObjectNotFoundError, Feed.FeedService | Database.Service> =>
  Effect.gen(function* () {
    invariant(agent.chat, 'Agent must have an existing chat to reset.');

    const existingFeed = yield* agent.chat.pipe(Database.load).pipe(
      Effect.map((_) => _.feed),
      Effect.flatMap(Database.load),
    );
    const runtime = yield* Effect.runtime<Feed.FeedService>();
    const existingContextBinder = yield* acquireReleaseResource(
      () =>
        new AiContextBinder({
          feed: existingFeed,
          runtime,
        }),
    );
    const blueprints = existingContextBinder.getBlueprints().map((blueprint) => Ref.make(blueprint));
    const objects = existingContextBinder.getObjects().map((object) => Ref.make(object));

    const feed = yield* Database.add(Feed.make());
    const contextBinder = new AiContextBinder({ feed, runtime });
    yield* Effect.promise(() =>
      contextBinder.bind({
        blueprints,
        objects,
      }),
    );
    const chat = yield* Database.add(
      Chat.make({
        feed: Ref.make(feed),
      }),
    );
    Obj.setParent(feed, chat);

    Obj.change(agent, (agent) => {
      agent.chat = Ref.make(chat);
    });

    yield* Database.add(
      Relation.make(Chat.CompanionTo, {
        [Relation.Source]: chat,
        [Relation.Target]: agent,
      }),
    );
  }).pipe(Effect.scoped);

export const getFromChatContext: Effect.Effect<Agent, never, AiContextService> = Effect.gen(function* () {
  const agents = yield* Function.pipe(AiContextService.findObjects(Agent));
  if (agents.length !== 1) {
    throw new Error('There should be exactly one agent in context. Got: ' + agents.length);
  }
  const agent = agents[0];
  return agent;
});
