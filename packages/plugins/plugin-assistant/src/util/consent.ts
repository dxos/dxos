//
// Copyright 2026 DXOS.org
//

import * as Deferred from 'effect/Deferred';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';

import type * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import { Consent } from '@dxos/compute-runtime';
import * as Agent from '@dxos/compute/Agent';
import * as LayerSpec from '@dxos/compute/LayerSpec';
import * as Operation from '@dxos/compute/Operation';
import { Database, Feed, Obj } from '@dxos/echo';
import { PublicKey } from '@dxos/keys';
import { Grant, Permission, Principal, Subject } from '@dxos/permission';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { type ContentBlock, Message } from '@dxos/types';

/**
 * What the person can answer. "Allow for this chat" grants the permission to the session's authority, so it holds for
 * the chat's later calls and survives a reload with the session's process.
 */
export const CONSENT_OPTIONS: readonly ContentBlock.RequestOption[] = [
  { id: 'allow', label: 'Allow', kind: 'allow_once' },
  { id: 'allow-chat', label: 'Allow for this chat', kind: 'allow_always' },
  { id: 'deny', label: 'Deny', kind: 'reject_once' },
];

type Pending = {
  readonly chatId: string;
  readonly answer: Deferred.Deferred<ContentBlock.RequestOption['kind']>;
};

/** Requests awaiting an answer, by request id; the chat UI answers through {@link respond}. */
const pending = new Map<string, Pending>();

const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

/** The request card's title: what the agent is about to do, in the operation's own words. */
export const consentTitle = (op: Operation.Definition.Any): string =>
  `Allow the assistant to ${lowerFirst(op.meta.name ?? op.meta.key)}?`;

/**
 * The runtime's {@link Consent.Service} for a chat's processes: a call the session's authority refused for a
 * consentable requirement is put to the person as a request card in the chat whose conversation the process works in.
 * "Allow for this chat" mints a grant from the person's identity to the refusing authority's principal.
 */
export const consentLayerSpec = (manager: CapabilityManager.CapabilityManager) =>
  LayerSpec.make({ affinity: 'process', requires: [Database.Service], provides: [Consent.Service] }, (context) =>
    Layer.effect(
      Consent.Service,
      Effect.gen(function* () {
        const database = yield* Effect.context<Database.Service>();
        return {
          ask: ({ principal, requirement, op, input }) =>
            Effect.gen(function* () {
              const conversation = context.conversation;
              const feed =
                conversation !== undefined
                  ? yield* Database.resolve(conversation, Feed.Feed).pipe(Effect.option)
                  : Option.none();
              const chat = Option.isSome(feed) ? yield* Agent.loadSessionForFeed(feed.value) : undefined;
              if (chat === undefined) {
                // No conversation to ask in: nobody can approve the call.
                return { _tag: 'Declined' } satisfies Consent.Answer;
              }
              const kind = yield* ask(chat, consentTitle(op), Operation.getConsentPreview(op, input));
              if (kind === 'reject_once' || kind === 'reject_always') {
                return { _tag: 'Declined' } satisfies Consent.Answer;
              }
              const did = manager.getAll(ClientCapabilities.Client)[0]?.halo.identity.get()?.did;
              if (kind === 'allow_once' || did === undefined) {
                return { _tag: 'Once' } satisfies Consent.Answer;
              }
              const grant = yield* Grant.make({
                issuer: Principal.identity(did),
                audience: principal,
                permissions: [Permission.make({ subject: Subject.any(), command: requirement.command })],
              });
              return { _tag: 'Grant', grants: [grant] } satisfies Consent.Answer;
            }).pipe(Effect.provide(database)),
        } satisfies Consent.Api;
      }),
    ),
  );

/** Posts a request card to the chat and waits for the person's answer; an interrupted wait cancels it. */
const ask = Effect.fnUntraced(function* (chat: Agent.Session, title: string, preview: ContentBlock.Request['preview']) {
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
  readonly chat: Agent.Session;
  readonly message: Message.Message;
  readonly requestId: string;
  readonly optionId: string;
};

/** Hands a person's answer to the consent request waiting on it; false when nothing is waiting on that request. */
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
