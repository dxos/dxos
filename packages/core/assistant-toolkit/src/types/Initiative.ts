//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Function from 'effect/Function';
import * as Schema from 'effect/Schema';

import { AiContextBinder, AiContextService, type ContextBinding } from '@dxos/assistant';
import { type Blueprint } from '@dxos/blueprints';
import { Type } from '@dxos/echo';
import { Database, Obj, Ref, Relation } from '@dxos/echo';
import { type ObjectNotFoundError } from '@dxos/echo/Err';
import { FormInputAnnotation } from '@dxos/echo/internal';
import { Queue } from '@dxos/echo-db';
import { acquireReleaseResource } from '@dxos/effect';
import { QueueService } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { QueueAnnotation, Text } from '@dxos/schema';
import type { Message } from '@dxos/types';

import * as Chat from './Chat';
import * as Plan from './Plan';

/**
 * Initiative schema definition.
 */
export const Initiative = Schema.Struct({
  name: Schema.String,

  spec: Type.Ref(Text.Text).pipe(FormInputAnnotation.set(false)),
  plan: Type.Ref(Plan.Plan).pipe(FormInputAnnotation.set(false)),

  artifacts: Schema.Array(
    Schema.Struct({
      // TODO(dmaretskyi): Consider gettings names from the artifact itself using Obj.getLabel.
      name: Schema.String,
      data: Type.Ref(Type.Obj),
    }),
  ).pipe(FormInputAnnotation.set(false)),

  /**
   * Incoming queue that the agent processes.
   */
  // NOTE: Named `queue` to conform to subscribable schema (see QueueAnnotation).
  queue: Schema.optional(Type.Ref(Queue).pipe(FormInputAnnotation.set(false))),

  // TODO(dmaretskyi): Multiple chats.
  chat: Schema.optional(Type.Ref(Chat.Chat).pipe(FormInputAnnotation.set(false))),

  /**
   * References to objects with a canonical queue property.
   * Schema must have the QueueAnnotation.
   */
  // TODO(dmaretskyi): Turn into an array of objects when form-data
  subscriptions: Schema.Array(Type.Ref(Type.Obj)).pipe(FormInputAnnotation.set(false)),

  useQualifyingAgent: Schema.optional(Schema.Boolean).annotations({
    title: 'Use qualifying agent on subscriptions',
    description:
      'If enabled, the qualifying agent will be used to determine if the event is relevant to the initiative. Related events will be added to the input queue of the initiative. It is recommended to enable this.',
  }),

  newChatOnEveryEvent: Schema.optional(Schema.Boolean).annotations({
    title: 'Wipe chat history on every event (deprecated)',
  }),

  // TODO(dmaretskyi): input queue?
}).pipe(
  Type.object({
    typename: 'dxos.org/type/Initiative',
    version: '0.1.0',
  }),
  QueueAnnotation.set(true),
);

export interface Initiative extends Schema.Schema.Type<typeof Initiative> {}

/**
 * Creates a fully initialized Initiative with chat, queue, and context bindings.
 *
 * @param props - Initiative properties including spec, plan, blueprints, and context objects.
 * @param blueprint - The blueprint to use for the initiative context.
 * @returns An Effect that yields the initialized Initiative.
 */
// TODO(burdon): Rename make and move into Initiative.ts?
export const makeInitialized = (
  props: Omit<Obj.MakeProps<typeof Initiative>, 'spec' | 'plan' | 'artifacts' | 'subscriptions' | 'chat'> &
    Partial<Pick<Obj.MakeProps<typeof Initiative>, 'artifacts' | 'subscriptions'>> & {
      spec: string;
      blueprints?: Ref.Ref<Blueprint.Blueprint>[];
      contextObjects?: Ref.Ref<Obj.Any>[];
    },
  blueprint: Blueprint.Blueprint,
): Effect.Effect<Initiative, never, QueueService | Database.Service> =>
  Effect.gen(function* () {
    const initiative = Obj.make(Initiative, {
      ...props,
      spec: Ref.make(Text.make(props.spec)),
      plan: Ref.make(Plan.makePlan({ tasks: [] })),
      artifacts: props.artifacts ?? [],
      subscriptions: props.subscriptions ?? [],
      useQualifyingAgent: props.useQualifyingAgent ?? true,
    });
    yield* Database.add(initiative);
    const queue = yield* QueueService.createQueue<Message.Message | ContextBinding>();
    const contextBinder = new AiContextBinder({ queue });
    // TODO(dmaretskyi): Blueprint registry.
    const initiativeBlueprint = yield* Database.add(Obj.clone(blueprint, { deep: true }));
    yield* Effect.promise(() =>
      contextBinder.bind({
        blueprints: [Ref.make(initiativeBlueprint), ...(props.blueprints ?? [])],
        objects: [Ref.make(initiative), ...(props.contextObjects ?? [])],
      }),
    );
    const chat = yield* Database.add(
      Chat.make({
        queue: Ref.fromDXN(queue.dxn),
      }),
    );
    yield* Database.add(
      Relation.make(Chat.CompanionTo, {
        [Relation.Source]: chat,
        [Relation.Target]: initiative,
      }),
    );

    const inputQueue = yield* QueueService.createQueue();

    Obj.change(initiative, (initiative) => {
      initiative.chat = Ref.make(chat);
      initiative.queue = Ref.fromDXN(inputQueue.dxn);
    });

    return initiative;
  });

/**
 * Resets the initiative chat history by rebuilding the chat context.
 * Preserves the existing blueprints and objects from the current chat context.
 *
 * @param initiative - The initiative whose chat history should be reset. Must have an existing chat.
 * @returns An Effect that resets the chat history.
 */
export const resetChatHistory = (
  initiative: Initiative,
): Effect.Effect<void, ObjectNotFoundError, QueueService | Database.Service> =>
  Effect.gen(function* () {
    invariant(initiative.chat, 'Initiative must have an existing chat to reset.');

    const existingQueue = yield* initiative.chat.pipe(Database.load).pipe(
      Effect.map((_) => _.queue),
      Effect.flatMap(Database.load),
    );
    const existingContextBinder = yield* acquireReleaseResource(
      () =>
        new AiContextBinder({
          queue: existingQueue,
        }),
    );
    const blueprints = existingContextBinder.getBlueprints().map((blueprint) => Ref.make(blueprint));
    const objects = existingContextBinder.getObjects().map((object) => Ref.make(object));

    const queue = yield* QueueService.createQueue();
    const contextBinder = new AiContextBinder({ queue });
    yield* Effect.promise(() =>
      contextBinder.bind({
        blueprints,
        objects,
      }),
    );
    const chat = yield* Database.add(
      Chat.make({
        queue: Ref.fromDXN(queue.dxn),
      }),
    );

    Obj.change(initiative, (initiative) => {
      initiative.chat = Ref.make(chat);
    });

    yield* Database.add(
      Relation.make(Chat.CompanionTo, {
        [Relation.Source]: chat,
        [Relation.Target]: initiative,
      }),
    );
  }).pipe(Effect.scoped);

export const getFromChatContext: Effect.Effect<Initiative, never, AiContextService> = Effect.gen(function* () {
  const initiatives = yield* Function.pipe(AiContextService.findObjects(Initiative));
  if (initiatives.length !== 1) {
    throw new Error('There should be exactly one initiative in context. Got: ' + initiatives.length);
  }
  const initiative = initiatives[0];
  return initiative;
});
