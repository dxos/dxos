//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { type RpcStub, RpcTarget } from 'capnweb';
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

/** How often messages that arrived during a turn are added to the chat. */
const DRAIN_INTERVAL_MS = 500;

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
 * The callback object a chat subscription calls. Only the subscriber's methods are public: capnweb
 * types everything public on a target it is handed, and the state lives in the follower instead.
 */
class ChatTarget extends RpcTarget implements Protocol.ChatSubscriber {
  readonly #follower: TurnFollower;

  constructor(follower: TurnFollower) {
    super();
    this.#follower = follower;
  }

  streamGeneration(): void {}
  deleted(): void {}
  changeApplied(): void {}
  stream(): void {}

  metadata(chat: Protocol.ChatMetadata): void {
    this.#follower.metadata(chat);
  }

  message(message: Protocol.ChatMessage): void {
    this.#follower.message(message);
  }
}

/**
 * Follows one workspace chat: hands each new agent message on as it lands, and settles once the
 * agent that a prompt started stops running.
 */
class TurnFollower {
  #chatId: number | undefined;
  #started = false;
  #lastSequence = -1;
  #metadata: Protocol.ChatMetadata | undefined;
  readonly #resolve: (metadata: Protocol.ChatMetadata | undefined) => void;
  readonly done: Promise<Protocol.ChatMetadata | undefined>;

  constructor(
    chatId: number | undefined,
    private readonly _onMessage: (message: Protocol.ChatMessage) => void,
  ) {
    this.#chatId = chatId;
    const { promise, resolve } = Promise.withResolvers<Protocol.ChatMetadata | undefined>();
    this.done = promise;
    this.#resolve = resolve;
  }

  /** Starts following a chat created by this turn, at its first message. */
  follow(chatId: number): void {
    this.#chatId = chatId;
  }

  metadata(chat: Protocol.ChatMetadata): void {
    if (chat.id !== this.#chatId) {
      return;
    }
    this.#metadata = chat;
    if (chat.activeAgent) {
      this.#started = true;
    } else if (this.#started) {
      this.#resolve(chat);
    }
  }

  message(message: Protocol.ChatMessage): void {
    if (message.chatId !== this.#chatId || message.sequence <= this.#lastSequence) {
      return;
    }
    this.#lastSequence = message.sequence;
    this._onMessage(message);
  }

  get lastMetadata(): Protocol.ChatMetadata | undefined {
    return this.#metadata;
  }
}

/** Runs one turn of the workspace agent for a Composer chat. */
const runTurn = (
  { chat, feed }: { chat: Chat.Chat; feed: Feed.Feed },
  request: TurnRequest,
): Effect.Effect<Message.Message[], CloudflareOsError, Database.Service> =>
  Effect.gen(function* () {
    const workspace = yield* boundWorkspace;
    const overseer = yield* Account.openWorkspace(workspace);
    const produced: Message.Message[] = [];
    const append = (messages: Message.Message[]) =>
      Effect.gen(function* () {
        if (messages.length > 0) {
          produced.push(...messages);
          yield* Feed.append(feed, messages);
        }
      });

    yield* append([Message.make({ sender: 'user', blocks: promptBlocks(request.prompt) })]);

    // Messages arrive on the RPC session's callbacks; they are queued and folded into the feed here.
    const pending: Protocol.ChatMessage[] = [];
    const existing = chatIdOf(chat);
    const follower = new TurnFollower(existing, (message) => pending.push(message));
    const subscription = overseer.subscribeToChat(new ChatTarget(follower));
    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        void subscription.then(Client.dispose, () => {});
      }),
    );
    yield* Client.call('Could not follow the workspace chat.', () => subscription);

    const text = promptText(request.prompt);
    const models = yield* Client.call('Could not list the workspace models.', () => overseer.listModels());
    const model = chat.session?.agentModel ?? models[0]?.id ?? null;
    if (existing === undefined) {
      const chatId = yield* Client.call('Could not start a workspace chat.', () => overseer.newChat(text, model));
      follower.follow(chatId);
      recordChatId(chat, chatId);
    } else {
      yield* Client.call('Could not send the message.', () => overseer.sendChatMessage(existing, text, model));
    }

    const drain = Effect.suspend(() => {
      const blocks = pending.splice(0).flatMap(Projection.messageBlocks);
      return append(blocks.length > 0 ? [Message.make({ sender: 'assistant', blocks })] : []);
    });

    // Fold messages into the feed while the turn runs, so the chat shows progress as it happens.
    const deadline = Date.now() + TURN_TIMEOUT_MS;
    let finished: Protocol.ChatMetadata | undefined;
    while (finished === undefined && Date.now() < deadline) {
      finished = yield* Effect.raceFirst(
        Effect.promise(() => follower.done),
        Effect.sleep(DRAIN_INTERVAL_MS).pipe(Effect.as(undefined)),
      );
      yield* drain;
    }

    const chatId = chatIdOf(chat);
    const metadata = finished ?? follower.lastMetadata;
    const requests: ContentBlock.Request[] = [];
    if (chatId !== undefined && metadata?.proposedChangeWorkpieces && metadata.proposedChangeWorkpieces.length > 0) {
      const gadgets = yield* Account.listGadgets(overseer);
      const titles = metadata.proposedChangeWorkpieces.flatMap(
        (id) => gadgets.find((gadget) => gadget.id === id)?.title ?? [],
      );
      requests.push(Projection.mergeRequest(chatId, titles));
    }
    const actions = yield* Client.call('Could not read pending actions.', () => overseer.listActions());
    requests.push(
      ...actions.entries
        .filter((entry) => entry.type === 'action' && entry.state === 'pending')
        .map(Projection.actionRequest),
    );
    if (requests.length > 0) {
      yield* append([Message.make({ sender: 'assistant', blocks: requests })]);
    }
    yield* refreshWorkspace(workspace).pipe(
      Effect.catch((error) => Effect.sync(() => log.warn('refresh failed', { error }))),
    );
    return produced;
  }).pipe(Effect.scoped);

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
    const overseer = yield* Account.openWorkspace(workspace);
    yield* runAnswer(overseer, target, optionId);
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
  }).pipe(Effect.scoped);

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
