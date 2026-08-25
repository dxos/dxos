//
// Copyright 2024 DXOS.org
//

// @import-as-namespace

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import type { Harness } from '@dxos/assistant';
import * as Instructions from '@dxos/compute/Instructions';
import * as Project from '@dxos/compute/Project';
import { Annotation, Database, DXN, Feed, Filter, Obj, Ref, Type } from '@dxos/echo';
import { FormInputAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { type EntityNotFoundError } from '@dxos/echo/Error';
import { type Text } from '@dxos/schema';
import { Outline, type TaskSet } from '@dxos/types';

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
 * Refs to the chats accompanying an object, stored on the subject itself (replaces the former
 * `CompanionTo` relation): the annotation is deleted with the subject, and its refs make the
 * parented chats real children — referenced and cascaded — rather than ref-less parent-edge
 * orphans reachable only by index query.
 */
export const CompanionChatAnnotation = Annotation.make({
  id: 'org.dxos.assistant.companionChats',
  schema: Schema.Array(Ref.Ref(Chat)),
});

/**
 * Links a chat to the subject it accompanies (a Project, an Agent, a document, ...): a ref on the
 * subject via {@link CompanionChatAnnotation} plus the ECHO parent edge. Idempotent per chat.
 */
export const linkCompanion = ({ chat, subject }: { chat: Chat; subject: Obj.Unknown }): void => {
  Obj.update(subject, (subject) => {
    const chats = Annotation.get(subject, CompanionChatAnnotation).pipe(
      Option.getOrElse((): readonly Ref.Ref<Chat>[] => []),
    );
    if (!chats.some((ref) => ref.uri === Ref.make(chat).uri)) {
      Annotation.set(subject, CompanionChatAnnotation, [...chats, Ref.make(chat)]);
    }
  });
  Obj.setParent(chat, subject);
};

/**
 * Returns the conversation's working outline, creating one lazily: a project chat (parented to a
 * project, directly or through its agent) resolves — and if needed creates — the PROJECT's outline,
 * so all of a project's chats share one scratch surface; a standalone chat owns its own.
 */
export const ensureOutline = (chat: Chat): Effect.Effect<Outline.Outline, EntityNotFoundError, Database.Service> =>
  Effect.gen(function* () {
    const project = peekProject(chat);
    if (project) {
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

/** Bound on the parent walk below; a conversation sits one or two edges under its project. */
const MAX_OWNER_DEPTH = 8;

/**
 * The project a conversation belongs to, if any.
 *
 * Walks the parent chain rather than reading the immediate parent, because a chat reaches its project
 * through whatever owns it — directly for a project chat, through the agent for an agent's chat.
 */
export const peekProject = (chat: Chat): Project.Project | undefined => {
  let owner: Obj.Unknown | undefined = Obj.getParent(chat);
  for (let depth = 0; owner && depth < MAX_OWNER_DEPTH; depth++) {
    if (Obj.instanceOf(Project.Project, owner)) {
      return owner;
    }
    owner = Obj.getParent(owner);
  }
  return undefined;
};

/**
 * The task set a conversation's promoted items are filed into: the owning project's ledger.
 *
 * An outline owns no task set, so a conversation with no project above it has nowhere to promote to;
 * callers withhold the affordance rather than create a set nothing else can find.
 */
export const peekTaskSetRef = (chat: Chat): Ref.Ref<TaskSet.TaskSet> | undefined => peekProject(chat)?.taskSet;

/**
 * The conversation's working-outline ref if one already exists (the parent project's, else the
 * chat's own) — never creates. See {@link ensureOutline} for the creating variant.
 */
export const peekOutlineRef = (chat: Chat): Ref.Ref<Outline.Outline> | undefined => {
  const project = peekProject(chat);
  return project ? project.outline : chat.outline;
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
  // Loaded here rather than imported: `@dxos/assistant` pulls the AI session runtime (MCP SDK,
  // Anthropic client, ~280 KB), and this module carries the Chat *schema*, which core plugins
  // reference for their operation definitions.
  const { Harness: HarnessRuntime } = yield* Effect.promise(() => import('@dxos/assistant'));
  const chats = yield* HarnessRuntime.queryContext(Filter.type(Chat));
  if (chats.length !== 1) {
    return yield* Effect.fail(new HarnessContextError({ type: 'chat', count: chats.length }));
  }

  return chats[0];
});
