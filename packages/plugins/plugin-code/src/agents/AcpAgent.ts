//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as acp from '@agentclientprotocol/sdk';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import type * as Exit from 'effect/Exit';
import * as Fiber from 'effect/Fiber';
import * as Queue from 'effect/Queue';
import * as Scope from 'effect/Scope';

import { type MakeTurnProducer, type TurnRequest } from '@dxos/agent-runtime';
import { AiAssistantError, type Chat } from '@dxos/assistant';
import * as Trace from '@dxos/compute/Trace';
import { type Database, Feed, Obj } from '@dxos/echo';
import { type ContentBlock, Message } from '@dxos/types';

import { AgentError } from '../errors.ts';
import * as AcpSession from './AcpSession.ts';
import * as Projection from './Projection.ts';

/** How long a session with no turns stays connected; the next prompt after that reloads it. */
export const IDLE_TIMEOUT = Duration.minutes(30);

/** Foreign-key source under which a chat records an agent's own session id. */
export const sessionKeySource = (agent: string): string => `acp:${agent}`;

/** The agent's session id recorded on the chat, to continue it after a restart. */
export const sessionIdOf = (chat: Chat.Chat, agent: string): string | undefined =>
  Obj.getKeys(chat, sessionKeySource(agent)).at(-1)?.id;

type Live = { session: AcpSession.Session; idle?: Fiber.Fiber<void> };

/**
 * Live agent sessions, one per chat, kept connected between turns: an agent process ends with each
 * idle turn, and restarting the agent for every prompt would cost seconds. A session closes after
 * {@link IDLE_TIMEOUT} without a turn, or when its agent exits.
 */
export class Sessions {
  readonly #live = new Map<string, Live>();
  readonly #scope: Scope.Scope;
  readonly #idleTimeout: Duration.Duration;

  private constructor(scope: Scope.Scope, idleTimeout: Duration.Duration) {
    this.#scope = scope;
    this.#idleTimeout = idleTimeout;
  }

  /** Closing the scope closes every session. */
  static make = (options: { idleTimeout?: Duration.Input } = {}): Effect.Effect<Sessions, never, Scope.Scope> =>
    Effect.gen(function* () {
      const sessions = new Sessions(yield* Effect.scope, Duration.fromInputUnsafe(options.idleTimeout ?? IDLE_TIMEOUT));
      yield* Effect.addFinalizer(() => Effect.sync(() => sessions.#closeAll()));
      return sessions;
    });

  /** The chat's live session, or a new one from `open`; either way its idle clock restarts. */
  acquire(
    key: string,
    open: () => Effect.Effect<AcpSession.Session, AgentError>,
  ): Effect.Effect<AcpSession.Session, AgentError> {
    return Effect.gen({ self: this }, function* () {
      const existing = this.#live.get(key);
      if (existing?.idle) {
        yield* Fiber.interrupt(existing.idle);
      }
      const live = existing ?? { session: yield* open() };
      if (!existing) {
        this.#live.set(key, live);
        void live.session.closed.finally(() => {
          if (this.#live.get(key) === live) {
            this.#live.delete(key);
          }
        });
      }
      live.idle = undefined;
      return live.session;
    });
  }

  /** Starts the idle clock once a turn is over. */
  release(key: string): Effect.Effect<void> {
    return Effect.gen({ self: this }, function* () {
      const live = this.#live.get(key);
      if (!live) {
        return;
      }
      live.idle = yield* Effect.sleep(this.#idleTimeout).pipe(
        Effect.andThen(Effect.sync(() => live.session.close())),
        Effect.forkIn(this.#scope),
      );
    });
  }

  /** Answers a permission request in the chat's session; false when nothing is waiting on it. */
  respond(key: string, requestId: string, optionId: string | undefined): boolean {
    return this.#live.get(key)?.session.respond(requestId, optionId) ?? false;
  }

  has(key: string): boolean {
    return this.#live.has(key);
  }

  #closeAll(): void {
    for (const { session } of this.#live.values()) {
      session.close();
    }
    this.#live.clear();
  }
}

export type AgentOptions = {
  /** The harness id this agent registers under (`chat.session.harness`). */
  id: string;
  sessions: Sessions;
  /** Starts the agent process in `cwd` and returns its ACP stream. */
  connect: (cwd: string) => Effect.Effect<acp.Stream, AgentError>;
  /** The directory the agent works in for this chat. */
  workspace: (chat: Chat.Chat) => Effect.Effect<string, AgentError>;
  /** Permission mode a new session starts in. */
  mode?: () => string | undefined;
  mcpServers?: (chat: Chat.Chat) => Effect.Effect<acp.McpServer[]>;
  /** This device's key: a chat runs only on the device that first ran it, since the agent's state lives there. */
  device?: () => string | undefined;
};

type TurnEvent =
  | { _tag: 'update'; update: acp.SessionUpdate }
  | { _tag: 'permission'; request: acp.RequestPermissionRequest }
  | { _tag: 'done'; exit: Exit.Exit<acp.PromptResponse, AgentError> };

/**
 * An ACP agent as Composer's turn engine. Each turn borrows the chat's live session (starting or
 * reloading it as needed), records the prompt in the transcript, streams the agent's text as it
 * arrives, appends each finished message, and parks permission requests in the chat as request
 * blocks until someone answers. Interrupting a turn cancels it in the agent; the session stays warm.
 */
export const makeTurnProducer =
  (options: AgentOptions): MakeTurnProducer =>
  ({ chat, feed }) =>
    Effect.succeed({
      // The agent brings its own tools; Composer's operations reach it through MCP.
      getSkills: () => [],
      runTurn: (request: TurnRequest) =>
        runTurn(options, { chat, feed }, request).pipe(
          Effect.mapError((cause) => new AiAssistantError({ message: cause.message, cause })),
        ),
    });

/** One turn of an ACP agent against a chat; what the turn producer runs. */
export const runTurn = (
  options: AgentOptions,
  { chat, feed }: { chat: Chat.Chat; feed: Feed.Feed },
  request: TurnRequest,
): Effect.Effect<Message.Message[], AgentError, Database.Service | Trace.TraceService> =>
  Effect.gen(function* () {
    const started = Date.now();
    const device = options.device?.();
    const host = chat.session?.host;
    if (host !== undefined && device !== undefined && host !== device) {
      return yield* Effect.fail(
        new AgentError({ message: 'This chat runs on another device, which is the only one that can drive it.' }),
      );
    }
    if (host === undefined && device !== undefined) {
      Obj.update(chat, (chat) => {
        chat.session = { ...chat.session, host: device };
      });
    }

    const cwd = yield* options.workspace(chat);
    const resume = sessionIdOf(chat, options.id);
    const session = yield* options.sessions.acquire(chat.id, () =>
      Effect.gen(function* () {
        const stream = yield* options.connect(cwd);
        const mcpServers = options.mcpServers ? yield* options.mcpServers(chat) : [];
        return yield* AcpSession.open({ stream, cwd, resume, mcpServers, mode: options.mode?.() });
      }),
    );
    if (session.sessionId !== resume) {
      Obj.update(chat, (chat) => {
        Obj.getMeta(chat).keys.push({ source: sessionKeySource(options.id), id: session.sessionId });
      });
    }

    const produced: Message.Message[] = [];
    const append = (messages: Message.Message[]) =>
      Effect.gen(function* () {
        if (messages.length === 0) {
          return;
        }
        for (const message of messages) {
          for (const block of message.blocks) {
            yield* Trace.write(Trace.CompleteBlock, {
              messageId: message.id,
              role: message.sender.role ?? 'assistant',
              block,
            });
          }
        }
        produced.push(...messages);
        yield* Feed.append(feed, messages);
      });

    yield* append([Message.make({ sender: 'user', blocks: promptBlocks(request.prompt) })]);

    const events = yield* Queue.unbounded<TurnEvent>();
    const projection = new Projection.TurnProjection();
    const streamingId = Obj.ID.random();
    let streamed = '';

    const handle = (event: Exclude<TurnEvent, { _tag: 'done' }>) =>
      Effect.gen(function* () {
        if (event._tag === 'permission') {
          const toolCallId = event.request.toolCall.toolCallId;
          const block: ContentBlock.Request = {
            _tag: 'request',
            requestId: AcpSession.requestId(event.request),
            title: event.request.toolCall.title ?? 'Allow this action?',
            toolCallId,
            options: event.request.options.map(({ optionId, name, kind }) => ({ id: optionId, label: name, kind })),
          };
          yield* append([...projection.reveal(toolCallId), Message.make({ sender: 'assistant', blocks: [block] })]);
          return;
        }

        const { update } = event;
        const completed = projection.apply(update);
        if (completed.length > 0) {
          streamed = '';
        }
        yield* append(completed);
        if (update.sessionUpdate === 'agent_message_chunk' && update.content.type === 'text') {
          streamed += update.content.text;
          yield* Trace.write(Trace.PartialBlock, {
            messageId: streamingId,
            role: 'assistant',
            block: { _tag: 'text', text: streamed, pending: true },
          });
        }
      });

    // The prompt runs beside the loop and reports its end through the same queue, so every update the
    // agent sent before answering is handled, in order, before the turn closes. Interrupting the turn
    // interrupts this child, which cancels the turn in the agent.
    yield* session
      .prompt(toAcpPrompt(request), {
        onUpdate: (update) => Queue.offerUnsafe(events, { _tag: 'update', update }),
        onPermission: (permission) => Queue.offerUnsafe(events, { _tag: 'permission', request: permission }),
      })
      .pipe(
        Effect.exit,
        Effect.flatMap((exit) => Queue.offer(events, { _tag: 'done', exit })),
        Effect.forkChild,
      );

    const response = yield* Effect.gen(function* () {
      while (true) {
        const event = yield* Queue.take(events);
        if (event._tag === 'done') {
          return yield* event.exit;
        }
        yield* handle(event);
      }
    }).pipe(
      Effect.onInterrupt(() => cancelOpenRequests(feed, produced)),
      Effect.ensuring(options.sessions.release(chat.id)),
    );

    yield* append(
      projection.finish({ stopReason: response.stopReason, usage: response.usage, durationMs: Date.now() - started }),
    );
    yield* cancelOpenRequests(feed, produced);
    return produced;
  });

export type RespondOptions = {
  chat: Chat.Chat;
  feed: Feed.Feed;
  /** The message holding the request block. */
  message: Message.Message;
  requestId: string;
  optionId: string;
};

/**
 * Answers a request block: hands the choice to the agent waiting on it, then records it in the
 * transcript. Returns false, recording nothing, when no turn is waiting on that request any more.
 */
export const respond = (
  sessions: Sessions,
  { chat, feed, message, requestId, optionId }: RespondOptions,
): Effect.Effect<boolean, never, Database.Service> =>
  Effect.gen(function* () {
    if (!sessions.respond(chat.id, requestId, optionId)) {
      return false;
    }
    Obj.update(message, (message) => {
      for (const block of message.blocks) {
        if (block._tag === 'request' && block.requestId === requestId) {
          block.resolution = { outcome: 'selected', optionId };
        }
      }
    });
    yield* Feed.append(feed, [message]);
    return true;
  });

/** Marks requests nobody answered as cancelled: the turn that asked them is over. */
const cancelOpenRequests = (feed: Feed.Feed, produced: Message.Message[]) =>
  Effect.gen(function* () {
    const open = produced.filter((message) =>
      message.blocks.some((block) => block._tag === 'request' && block.resolution === undefined),
    );
    for (const message of open) {
      Obj.update(message, (message) => {
        for (const block of message.blocks) {
          if (block._tag === 'request' && block.resolution === undefined) {
            block.resolution = { outcome: 'cancelled' };
          }
        }
      });
    }
    if (open.length > 0) {
      yield* Feed.append(feed, open);
    }
  });

const promptBlocks = (prompt: TurnRequest['prompt']): ContentBlock.Any[] =>
  typeof prompt === 'string' ? [{ _tag: 'text', text: prompt }] : [...prompt];

/** Composer prompt blocks as ACP content: text as text, anything else by the text it carries. */
const toAcpPrompt = (request: TurnRequest): acp.ContentBlock[] =>
  promptBlocks(request.prompt).flatMap((block): acp.ContentBlock[] =>
    block._tag === 'text' ? [{ type: 'text', text: block.text }] : [],
  );
