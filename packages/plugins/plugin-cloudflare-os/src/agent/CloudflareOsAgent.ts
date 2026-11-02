//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { type RpcStub } from 'capnweb';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Atom from 'effect/reactivity/Atom';

import { type MakeTurnProducer, type TurnRequest } from '@dxos/agent-runtime';
import { AiAssistantError, type Chat } from '@dxos/assistant';
import { Database, Feed, Filter, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import type * as AssistantCapabilities from '@dxos/plugin-assistant/AssistantCapabilities';
import { type ContentBlock, Message } from '@dxos/types';

import { Client, CloudflareOsError, type Protocol } from '#api';
import { CloudflareOs } from '#types';

import * as Account from '../Account.ts';
import { CHAT_KEY_SOURCE, CLOUDFLARE_OS_AGENT } from '../constants.ts';
import { refreshWorkspace } from '../operations/refresh.ts';
import * as Projection from './Projection.ts';

/** How long a turn may run before Composer stops waiting for it. */
const TURN_TIMEOUT_MS = 10 * 60_000;

/** How often a running turn is read; each read is one HTTP request. */
const POLL_INTERVAL_MS = 1_500;

/** The workspace chat a Composer chat continues, recorded on the chat after its first turn. */
export const chatIdOf = (chat: Chat.Chat): number | undefined => {
  const key = Obj.getMeta(chat).keys.find(({ source }) => source === CHAT_KEY_SOURCE);
  return key ? Number(key.id) : undefined;
};

const recordChatId = (chat: Chat.Chat, chatId: number): void => {
  Obj.update(chat, (chat) => {
    Obj.deleteKeys(chat, CHAT_KEY_SOURCE);
    Obj.getMeta(chat).keys.push({ source: CHAT_KEY_SOURCE, id: String(chatId) });
  });
};

/** The space's bound workspace; a space without one has nothing for the agent to run in. */
const boundWorkspace = Database.query(Filter.type(CloudflareOs.Workspace)).first.pipe(
  Effect.mapError((cause) => new CloudflareOsError({ message: 'Could not read the bound workspace.', cause })),
  Effect.flatMap(
    Option.match({
      onNone: () =>
        Effect.fail(
          new CloudflareOsError({
            message: 'No Cloudflare OS workspace is bound to this space. Connect Cloudflare OS and bind a workspace.',
          }),
        ),
      onSome: Effect.succeed,
    }),
  ),
);

/** Composer prompt blocks as the workspace agent's text: text as text, anything else left out. */
const promptText = (prompt: TurnRequest['prompt']): string =>
  (typeof prompt === 'string' ? [{ _tag: 'text' as const, text: prompt }] : [...prompt])
    .flatMap((block) => (block._tag === 'text' ? [block.text] : []))
    .join('\n\n');

const promptBlocks = (prompt: TurnRequest['prompt']): ContentBlock.Any[] =>
  typeof prompt === 'string' ? [{ _tag: 'text', text: prompt }] : [...prompt];

/**
 * The bound workspace's overseer in a fresh one-request session: every call made on it before the first
 * await goes in one HTTP request. A turn polls with these, since a request has no connection to lose.
 */
const batchOverseer = (account: Account.Account, workspaceId: string): RpcStub<Protocol.Overseer> =>
  Client.newBatch(account.url).authenticate(account.token).openWorkspace(workspaceId);

/** The last sequence among the messages, or -1 for none. */
const lastSequence = (messages: readonly Protocol.ChatMessage[]): number =>
  messages.reduce((last, message) => Math.max(last, message.sequence), -1);

/** One look at a turn: the chat's latest messages and its metadata. */
const poll = (account: Account.Account, workspaceId: string, chatId: number) =>
  Client.call('Could not read the workspace chat.', () => {
    const overseer = batchOverseer(account, workspaceId);
    return Promise.all([overseer.getChatHistory(chatId), overseer.listChats()]);
  }).pipe(
    Effect.map(([page, chats]) => ({
      messages: page.messages,
      metadata: chats.find(({ id }) => id === chatId),
    })),
  );

/** Runs one turn of the workspace agent for a Composer chat. */
const runTurn = (
  { chat, feed }: { chat: Chat.Chat; feed: Feed.Feed },
  request: TurnRequest,
): Effect.Effect<Message.Message[], CloudflareOsError, Database.Service> =>
  Effect.gen(function* () {
    const workspace = yield* boundWorkspace;
    const account = yield* Account.fromConnectionRef(workspace.connection);
    const produced: Message.Message[] = [];
    const append = (messages: Message.Message[]) =>
      Effect.gen(function* () {
        if (messages.length > 0) {
          produced.push(...messages);
          yield* Feed.append(feed, messages);
        }
      });

    yield* append([Message.make({ sender: 'user', blocks: promptBlocks(request.prompt) })]);

    const existing = chatIdOf(chat);
    const [models, before] = yield* Client.call('Could not reach the workspace.', () => {
      const overseer = batchOverseer(account, workspace.workspaceId);
      return Promise.all([
        overseer.listModels(),
        existing === undefined ? undefined : overseer.getChatHistory(existing),
      ]);
    });
    const model = chat.session?.agentModel ?? models[0]?.id ?? null;
    const text = promptText(request.prompt);

    // Only messages past the chat's current end belong to this turn.
    let seen = before ? lastSequence(before.messages) : -1;
    let chatId: number;
    if (existing === undefined) {
      chatId = yield* Client.call('Could not start a workspace chat.', () =>
        batchOverseer(account, workspace.workspaceId).newChat(text, model),
      );
      recordChatId(chat, chatId);
    } else {
      chatId = existing;
      yield* Client.call('Could not send the message.', () =>
        batchOverseer(account, workspace.workspaceId).sendChatMessage(chatId, text, model),
      );
    }

    // The turn has ended once its agent stops running, after it was seen running or answered.
    const deadline = Date.now() + TURN_TIMEOUT_MS;
    let started = false;
    let answered = false;
    let finished: Protocol.ChatMetadata | undefined;
    while (finished === undefined && Date.now() < deadline) {
      yield* Effect.sleep(POLL_INTERVAL_MS);
      const result = yield* poll(account, workspace.workspaceId, chatId).pipe(
        Effect.map(Option.some),
        Effect.catch((error) =>
          Effect.sync(() => {
            log.warn('poll failed; retrying', { error });
            return Option.none();
          }),
        ),
      );
      if (Option.isNone(result)) {
        continue;
      }
      const { messages, metadata } = result.value;
      const fresh = messages.filter(({ sequence }) => sequence > seen).sort((a, b) => a.sequence - b.sequence);
      seen = Math.max(seen, lastSequence(fresh));
      answered ||= fresh.some(({ author }) => author.type === 'agent');
      const blocks = fresh.flatMap(Projection.messageBlocks);
      yield* append(blocks.length > 0 ? [Message.make({ sender: 'assistant', blocks })] : []);
      if (metadata?.activeAgent) {
        started = true;
      } else if (metadata && (started || answered)) {
        finished = metadata;
      }
    }
    if (finished === undefined) {
      return yield* Effect.fail(new CloudflareOsError({ message: 'The Cloudflare OS agent did not finish in time.' }));
    }

    const gadgets = yield* refreshWorkspace(workspace).pipe(
      Effect.catch((error) =>
        Effect.sync(() => {
          log.warn('refresh failed', { error });
          return [...(workspace.gadgets ?? [])];
        }),
      ),
    );
    const requests: ContentBlock.Request[] = [];
    const proposed = finished.proposedChangeWorkpieces ?? [];
    if (proposed.length > 0) {
      const titles = proposed.flatMap((id) => gadgets.find((gadget) => gadget.id === id)?.title ?? []);
      requests.push(Projection.mergeRequest(chatId, titles));
    }
    const actions = yield* Client.call('Could not read pending actions.', () =>
      batchOverseer(account, workspace.workspaceId).listActions(),
    );
    requests.push(
      ...actions.entries
        .filter((entry) => entry.type === 'action' && entry.state === 'pending')
        .map(Projection.actionRequest),
    );
    if (requests.length > 0) {
      yield* append([Message.make({ sender: 'assistant', blocks: requests })]);
    }
    return produced;
  });

/** Answers a request this agent added: keeps or reverts a turn's changes, or approves or rejects an action. */
const respond = ({
  chat,
  message,
  requestId,
  optionId,
}: AssistantCapabilities.AgentResponse): Effect.Effect<boolean, CloudflareOsError, Database.Service> =>
  Effect.gen(function* () {
    const target = Projection.decodeRequestId(requestId);
    if (!target) {
      return false;
    }
    const workspace = yield* boundWorkspace;
    const account = yield* Account.fromConnectionRef(workspace.connection);
    yield* runAnswer(batchOverseer(account, workspace.workspaceId), target, optionId);
    Obj.update(message, (message) => {
      for (const block of message.blocks) {
        if (block._tag === 'request' && block.requestId === requestId && block.resolution === undefined) {
          block.resolution = { outcome: 'selected', optionId };
        }
      }
    });
    const feed = yield* Database.load(chat.feed).pipe(Effect.option);
    if (Option.isSome(feed)) {
      yield* Feed.append(feed.value, [message]);
    }
    yield* refreshWorkspace(workspace).pipe(
      Effect.catch((error) => Effect.sync(() => log.warn('refresh failed', { error }))),
    );
    return true;
  });

const runAnswer = (
  overseer: RpcStub<Protocol.Overseer>,
  target: Projection.RequestTarget,
  optionId: string,
): Effect.Effect<void, CloudflareOsError> => {
  switch (target.kind) {
    case 'merge':
      return optionId === 'accept'
        ? Client.call('Could not accept the changes.', () => overseer.mergeChanges(target.chatId)).pipe(Effect.asVoid)
        : Client.call('Could not revert the changes.', () => overseer.revertChanges(target.chatId));
    case 'action':
      return optionId === 'approve'
        ? Client.call('Could not approve the action.', () => overseer.approveAction(target.actionId))
        : Client.call('Could not reject the action.', () => overseer.rejectAction(target.actionId));
  }
};

const makeTurnProducer: MakeTurnProducer = ({ chat, feed }) =>
  Effect.succeed({
    // The workspace agent's tools run in the workspace, behind its gatekeepers.
    getSkills: () => [],
    runTurn: (request: TurnRequest) =>
      runTurn({ chat, feed }, request).pipe(
        Effect.mapError((cause) => new AiAssistantError({ message: cause.message, cause })),
      ),
  });

/** The workspace's agent as an agent a Composer chat can run on. */
export const agent: AssistantCapabilities.Agent = {
  id: CLOUDFLARE_OS_AGENT,
  label: 'Cloudflare OS',
  icon: 'ph--cloud--regular',
  locations: ['edge'],
  ownModel: true,
  availability: Atom.make<AssistantCapabilities.AgentAvailability>({ available: true }),
  makeTurnProducer,
  respond: (response) =>
    respond(response).pipe(
      Effect.catch((error) =>
        Effect.sync(() => {
          log.warn('request not answered', { chat: response.chat.id, error });
          return false;
        }),
      ),
    ),
};
