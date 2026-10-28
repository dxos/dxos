//
// Copyright 2026 DXOS.org
//

import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import type * as Chat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import type * as Process from '@dxos/compute/Process';
import { Database, Feed, Obj } from '@dxos/echo';
import { PublicKey } from '@dxos/keys';
import { type ContentBlock, Message } from '@dxos/types';

/** What the person can answer; `allow_always` lasts as long as this client keeps the chat's guard. */
export const CONSENT_OPTIONS: readonly ContentBlock.RequestOption[] = [
  { id: 'allow', label: 'Allow', kind: 'allow_once' },
  { id: 'allow-chat', label: 'Allow for this chat', kind: 'allow_always' },
  { id: 'deny', label: 'Deny', kind: 'reject_once' },
];

/**
 * The part of a `@dxos/permission` requirement this guard reads; decoded locally since that package is
 * private and this one is published.
 */
const ConsentRequirement = Schema.Struct({
  command: Schema.String,
  consentable: Schema.optional(Schema.Boolean),
});

type Pending = {
  readonly chatId: string;
  readonly answer: Deferred.Deferred<ContentBlock.RequestOption['kind']>;
};

/** Requests awaiting an answer, by request id; the chat UI answers through {@link respond}. */
const pending = new Map<string, Pending>();

/** Commands a person allowed for the rest of a chat, by chat id. */
const allowed = new Map<string, Set<string>>();

/**
 * One guard per chat and database: the agent service reuses a session only under the same guard, so a
 * fresh guard per call would restart the agent process on every prompt; a new database gets a new guard,
 * since the guard writes through the one it captured.
 */
const guards = new Map<string, { readonly db: Database.Database; readonly guard: Process.Guard }>();

const deny = (op: Operation.Definition.Any, message: string, context: Record<string, unknown> = {}) =>
  Effect.die(new Operation.OperationDeniedError({ message, context: { key: op.meta.key, ...context } }));

const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

/** The request card's title: what the agent is about to do, in the operation's own words. */
export const consentTitle = (op: Operation.Definition.Any): string =>
  `Allow the assistant to ${lowerFirst(op.meta.name ?? op.meta.key)}?`;

/**
 * A process guard for an agent a person is talking to: an operation whose requirements are all
 * consentable is admitted once the person allows it in the chat, where the guard posts a request card
 * and waits; one that is not consentable is refused, since this guard holds no grants.
 */
export const consentGuard = (chat: Chat.Chat): Effect.Effect<Process.Guard, never, Database.Service> =>
  Effect.gen(function* () {
    const { db } = yield* Database.Service;
    const existing = guards.get(chat.id);
    if (existing?.db === db) {
      return existing.guard;
    }
    // Captured so the check can write to the chat's feed from inside the agent process, which holds no
    // database of its own for this space.
    const context = yield* Effect.context<Database.Service>();
    const guard: Process.Guard = {
      check: (op, input) =>
        Effect.gen(function* () {
          const requirements = Operation.getRequirements(op).map((declared) =>
            Schema.decodeUnknownOption(ConsentRequirement)(declared),
          );
          if (requirements.some(Option.isNone)) {
            return yield* deny(op, `Operation "${op.meta.key}" declares a malformed requirement`);
          }
          const commands = requirements.flatMap((requirement) =>
            Option.isSome(requirement) ? [requirement.value] : [],
          );
          const refused = commands.find((requirement) => !requirement.consentable);
          if (refused) {
            return yield* deny(op, `Operation "${op.meta.key}" requires ${refused.command}, which needs a grant`, {
              command: refused.command,
            });
          }
          const asked = commands.filter((requirement) => !allowed.get(chat.id)?.has(requirement.command));
          if (asked.length === 0) {
            return;
          }

          const kind = yield* ask(chat, consentTitle(op), Operation.getConsentPreview(op, input)).pipe(
            Effect.provide(context),
          );
          if (kind === 'allow_always') {
            const set = allowed.get(chat.id) ?? new Set<string>();
            asked.forEach((requirement) => set.add(requirement.command));
            allowed.set(chat.id, set);
          }
          if (kind === 'reject_once' || kind === 'reject_always') {
            return yield* deny(op, `The user declined: ${consentTitle(op)}`, { reason: 'declined' });
          }
        }),
    };
    guards.set(chat.id, { db, guard });
    return guard;
  });

/** Posts a request card to the chat and waits for the person's answer; an interrupted wait cancels it. */
const ask = Effect.fnUntraced(function* (chat: Chat.Chat, title: string, preview: ContentBlock.Request['preview']) {
  // A chat always owns its feed, so a failed load is a defect rather than an answer.
  const feed = yield* Database.load(chat.feed).pipe(Effect.orDie);
  const requestId = PublicKey.random().toHex();
  const answer = yield* Deferred.make<ContentBlock.RequestOption['kind']>();
  const message = Message.make({
    sender: 'assistant',
    blocks: [{ _tag: 'request', requestId, title, options: [...CONSENT_OPTIONS], ...(preview && { preview }) }],
  });
  pending.set(requestId, { chatId: chat.id, answer });
  yield* Feed.append(feed, [message]);
  return yield* Deferred.await(answer).pipe(
    Effect.onInterrupt(() =>
      Effect.gen(function* () {
        resolve(message, requestId, undefined);
        yield* Feed.append(feed, [message]);
      }),
    ),
    Effect.ensuring(Effect.sync(() => pending.delete(requestId))),
  );
});

/** Records the outcome on the request block, so the card shows the answer instead of the buttons. */
const resolve = (message: Message.Message, requestId: string, optionId: string | undefined) =>
  Obj.update(message, (message) => {
    for (const block of message.blocks) {
      if (block._tag === 'request' && block.requestId === requestId && block.resolution === undefined) {
        block.resolution = optionId ? { outcome: 'selected', optionId } : { outcome: 'cancelled' };
      }
    }
  });

export type RespondOptions = {
  readonly chat: Chat.Chat;
  readonly message: Message.Message;
  readonly requestId: string;
  readonly optionId: string;
};

/** Hands a person's answer to the guard waiting on it; false when nothing is waiting on that request. */
export const respond = ({ chat, message, requestId, optionId }: RespondOptions) =>
  Effect.gen(function* () {
    const request = pending.get(requestId);
    const option = CONSENT_OPTIONS.find((option) => option.id === optionId);
    if (!request || request.chatId !== chat.id || !option) {
      return false;
    }
    resolve(message, requestId, optionId);
    const feed = yield* Database.load(chat.feed).pipe(Effect.orDie);
    yield* Feed.append(feed, [message]);
    yield* Deferred.succeed(request.answer, option.kind);
    return true;
  });
