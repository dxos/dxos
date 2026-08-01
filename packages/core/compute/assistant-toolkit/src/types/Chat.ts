//
// Copyright 2024 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';

import { Harness } from '@dxos/assistant';
import { Instructions, Project } from '@dxos/compute';
import { Annotation, Database, DXN, Feed, Filter, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { type EntityNotFoundError } from '@dxos/echo/Err';
import { type Text } from '@dxos/schema';
import { Outline } from '@dxos/types';

import { HarnessContextError } from '../errors';

/**
 * AI chat session.
 */
export class Chat extends Type.makeObject<Chat>(DXN.make('org.dxos.type.assistant.chat', '0.1.0'))(
  Schema.Struct({
    name: Schema.String.pipe(Schema.optional),
    viewType: Schema.String.pipe(Schema.optional),

    /**
     * Message feed.
     */
    feed: Ref.Ref(Feed.Feed).pipe(FormInputAnnotation.set(false)),

    /**
     * Instructions steering this conversation, rendered into the system prompt at request time.
     * Held by reference (never copied), so a project's chats follow edits to its instructions.
     */
    instructions: Schema.optional(Ref.Ref(Instructions.Instructions).pipe(FormInputAnnotation.set(false))),

    /**
     * Scratch checklist for a standalone chat, created lazily when the first item is recorded.
     * A project chat leaves this unset and writes the project's outline instead — see
     * {@link ensureOutline}.
     */
    outline: Schema.optional(Ref.Ref(Outline.Outline).pipe(FormInputAnnotation.set(false))),
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
 * Returns the conversation's working outline, creating one lazily: a project chat (parented to a
 * `Project`) resolves — and if needed creates — the PROJECT's outline, so all of a project's
 * chats share one scratch surface; a standalone chat owns its own.
 */
export const ensureOutline = (chat: Chat): Effect.Effect<Outline.Outline, EntityNotFoundError, Database.Service> =>
  Effect.gen(function* () {
    const parent = Obj.getParent(chat);
    if (parent && Obj.instanceOf(Project.Project, parent)) {
      const project = parent;
      if (project.outline) {
        return yield* Database.load(project.outline);
      }
      const outline = yield* Database.add(Outline.make({ name: project.name }));
      Obj.update(project, (project) => {
        project.outline = Ref.make(outline);
      });
      yield* Database.flush();
      return outline;
    }

    if (chat.outline) {
      return yield* Database.load(chat.outline);
    }

    const outline = yield* Database.add(Outline.make({ name: chat.name }));
    Obj.update(chat, (chat) => {
      chat.outline = Ref.make(outline);
    });

    yield* Database.flush();
    return outline;
  });

/**
 * Loads the markdown text object behind the conversation's working outline.
 */
export const ensureOutlineText = (
  chat: Chat,
): Effect.Effect<{ outline: Outline.Outline; text: Text.Text }, EntityNotFoundError, Database.Service> =>
  Effect.gen(function* () {
    const outline = yield* ensureOutline(chat);
    const text = yield* Database.load(outline.content);
    return { outline, text };
  });

/**
 * The conversation's working-outline ref if one already exists (the parent project's, else the
 * chat's own) — never creates. See {@link ensureOutline} for the creating variant.
 */
export const peekOutlineRef = (chat: Chat): Ref.Ref<Outline.Outline> | undefined => {
  const parent = Obj.getParent(chat);
  if (parent && Obj.instanceOf(Project.Project, parent)) {
    return parent.outline;
  }
  return chat.outline;
};

/** The conversation's checklist markdown, or a placeholder when none exists. Never creates. */
export const formatChecklist = (chat: Chat): Effect.Effect<string, never, Database.Service> =>
  Effect.gen(function* () {
    const ref = peekOutlineRef(chat);
    const outline = ref ? yield* Database.load(ref).pipe(Effect.orElseSucceed(() => undefined)) : undefined;
    const text = outline
      ? yield* Database.load(outline.content).pipe(Effect.orElseSucceed(() => undefined))
      : undefined;
    return text?.content ?? 'No checklist found.';
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

/**
 * Relation between a Chat and companion objects (e.g., artifacts, or the agent identity the
 * conversation runs as — see `Agent.loadForChat`).
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
