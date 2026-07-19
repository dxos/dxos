//
// Copyright 2024 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Harness } from '@dxos/assistant';
import { Annotation, Database, DXN, Feed, Filter, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { type EntityNotFoundError } from '@dxos/echo/Err';

import { HarnessContextError } from '../errors';
import * as Plan from './Plan';

/**
 * AI chat.
 */
export class Chat extends Type.makeObject<Chat>(DXN.make('org.dxos.type.assistant.chat', '0.1.0'))(
  Schema.Struct({
    name: Schema.String.pipe(Schema.optional),
    feed: Ref.Ref(Feed.Feed).pipe(FormInputAnnotation.set(false)),
    viewType: Schema.String.pipe(Schema.optional),

    /**
     * Session plan for tracking task progress within this conversation.
     * Created lazily when the first task is recorded.
     */
    plan: Schema.optional(Ref.Ref(Plan.Plan).pipe(FormInputAnnotation.set(false))),
  }).pipe(
    LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({
      icon: 'ph--sparkle--regular',
      hue: 'amber',
    }),
  ),
) {}

export const make = (props: Obj.MakeProps<typeof Chat>) => Obj.make(Chat, props);

/**
 * Returns the session plan, creating and attaching one when absent.
 */
export const ensurePlan = (chat: Chat): Effect.Effect<Plan.Plan, EntityNotFoundError, Database.Service> =>
  Effect.gen(function* () {
    if (chat.plan) {
      return yield* Database.load(chat.plan);
    }

    const plan = yield* Database.add(Plan.makePlan({ tasks: [] }));
    Obj.update(chat, (chat) => {
      chat.plan = Ref.make(plan);
    });
    yield* Database.flush();
    return plan;
  });

/**
 * Resolves the bound session {@link Chat} for the current conversation.
 * Planning and other session-scoped tools require exactly one chat in harness context.
 */
export const getFromContext: Effect.Effect<
  Chat,
  HarnessContextError | Harness.NotSupportedError,
  Harness.HarnessService
> = Effect.gen(function* () {
  const chats = yield* Harness.queryContext(Filter.type(Chat));
  if (chats.length !== 1) {
    return yield* Effect.fail(new HarnessContextError({ type: 'chat', count: chats.length }));
  }

  return chats[0];
});

/** @deprecated Use CompanionTo instead. */
export class LegacyCompanionTo extends Type.makeRelation<LegacyCompanionTo>(
  DXN.make('org.dxos.relation.assistant.companionTo', '0.1.0'),
)({
  source: Chat,
  target: Obj.Unknown,
})(
  Schema.Struct({
    id: Obj.ID,
  }),
) {}

/**
 * Relation between a Chat and companion objects (e.g., artifacts).
 */
export class CompanionTo extends Type.makeRelation<CompanionTo>(
  DXN.make('org.dxos.relation.assistant.companionTo', '0.1.0'),
)({
  source: Chat,
  target: Obj.Unknown,
})(
  Schema.Struct({
    id: Obj.ID,
  }),
) {}
