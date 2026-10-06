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
import * as Semaphore from 'effect/Semaphore';

import { type MakeTurnProducer, type TurnRequest } from '@dxos/agent-runtime';
import { AiAssistantError, type Chat } from '@dxos/assistant';
import * as Trace from '@dxos/compute/Trace';
import { type Database, Feed, Obj } from '@dxos/echo';
import { type ContentBlock, Message } from '@dxos/types';

import { meta } from '#meta';

import { AgentError } from '../errors.ts';
import * as AcpSession from './AcpSession.ts';
import * as Projection from './Projection.ts';
import * as Protocol from './Protocol.ts';

/** The environment variable an agent reads Composer's tools token from, which its MCP config names. */
export const TOOLS_TOKEN_ENV = Protocol.MCP_TOKEN_ENV;

/** How long a session with no turns stays connected; the next prompt after that reloads it. */
export const IDLE_TIMEOUT = Duration.minutes(30);

/** Foreign-key source under which a chat records an agent's own session id. */
export const sessionKeySource = (agent: string): string => `${meta.profile.key}.acp-session.${agent}`;

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
  /** Chats whose session is starting: busy, though not yet live. */
  readonly #opening = new Set<string>();
  readonly #locks = new Map<string, Semaphore.Semaphore>();
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
    // One at a time per chat, so two turns never each start an agent and orphan one of them.
    return this.#lockFor(key).withPermits(1)(
      Effect.gen({ self: this }, function* () {
        const existing = this.#live.get(key);
        if (existing?.idle) {
          yield* Fiber.interrupt(existing.idle);
        }
        if (!existing) {
          this.#opening.add(key);
        }
        const live = existing ?? {
          session: yield* open().pipe(Effect.ensuring(Effect.sync(() => this.#opening.delete(key)))),
        };
        if (!existing) {
          this.#live.set(key, live);
          void live.session.closed.then(() => {
            if (this.#live.get(key) === live) {
              this.#live.delete(key);
            }
          });
        }
        live.idle = undefined;
        return live.session;
      }),
    );
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

  /** Whether the chat's session is live or starting. */
  has(key: string): boolean {
    return this.#live.has(key) || this.#opening.has(key);
  }

  #lockFor(key: string): Semaphore.Semaphore {
    let lock = this.#locks.get(key);
    if (!lock) {
      lock = Semaphore.makeUnsafe(1);
      this.#locks.set(key, lock);
    }
    return lock;
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
  /** Starts the agent process in `cwd`, with Composer's tools token in its environment, and returns its ACP stream. */
  connect: (cwd: string, toolsToken?: string) => Effect.Effect<acp.Stream, AgentError>;
  /** The directory the agent works in for this chat. */
  workspace: (chat: Chat.Chat) => Effect.Effect<string, AgentError>;
  /** Permission mode a new session starts in. */
  mode?: () => string | undefined;
  /** Agent-specific options every session opens with (ACP `_meta`). */
  sessionMeta?: Record<string, unknown>;
  /** Composer's MCP tools for the chat, and the token the agent presents for them; fresh for each session. */
  tools?: (chat: Chat.Chat) => Effect.Effect<{ servers: acp.McpServer[]; token: string } | undefined>;
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
      // The agent's tools are its own and those of Composer's MCP server; none run as the process's skills.
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

    return yield* Effect.gen(function* () {
      const session = yield* options.sessions.acquire(chat.id, () =>
        Effect.gen(function* () {
          const tools = options.tools ? yield* options.tools(chat) : undefined;
          const stream = yield* options.connect(cwd, tools?.token);
          return yield* AcpSession.open({
            stream,
            cwd,
            resume,
            mcpServers: tools?.servers ?? [],
            mode: options.mode?.(),
            meta: options.sessionMeta,
          });
        }),
      );
      if (session.sessionId !== resume) {
        Obj.update(chat, (chat) => {
          Obj.getMeta(chat).keys.push({ source: sessionKeySource(options.id), id: session.sessionId });
        });
      }

      yield* append([Message.make({ sender: 'user', blocks: promptBlocks(request.prompt) })]);

      const events = yield* Queue.unbounded<TurnEvent>();
      const projection = new Projection.TurnProjection();

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
          yield* append(projection.apply(update));
          // The client derives "generating" from streamed text; a running tool call, named by its latest title, is
          // what this turn has to report itself.
          if (
            (update.sessionUpdate === 'tool_call' || update.sessionUpdate === 'tool_call_update') &&
            update.title &&
            update.status !== 'completed' &&
            update.status !== 'failed'
          ) {
            yield* Trace.emitRequestPhase('calling-tool', { detail: update.title });
          }
          // Streamed under the id the finished message will carry, so the thread swaps one for the other.
          const partial = projection.partial;
          if (
            partial &&
            (update.sessionUpdate === 'agent_message_chunk' || update.sessionUpdate === 'agent_thought_chunk')
          ) {
            yield* Trace.write(Trace.PartialBlock, { ...partial, role: 'assistant' });
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
      });

      yield* append(
        projection.finish({ stopReason: response.stopReason, usage: response.usage, durationMs: Date.now() - started }),
      );
      return produced;
    }).pipe(
      // However the turn ends, its questions can no longer be answered.
      Effect.ensuring(Effect.suspend(() => cancelOpenRequests(feed, produced))),
      Effect.ensuring(options.sessions.release(chat.id)),
    );
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
 * transcript. When nothing waits on it any more (the agent exited, the app restarted) the request is
 * recorded as cancelled instead, and the result is false.
 */
export const respond = (
  sessions: Sessions,
  { chat, feed, message, requestId, optionId }: RespondOptions,
): Effect.Effect<boolean, never, Database.Service> =>
  Effect.gen(function* () {
    const answered = sessions.respond(chat.id, requestId, optionId);
    Obj.update(message, (message) => {
      for (const block of message.blocks) {
        if (block._tag === 'request' && block.requestId === requestId && block.resolution === undefined) {
          block.resolution = answered ? { outcome: 'selected', optionId } : { outcome: 'cancelled' };
        }
      }
    });
    yield* Feed.append(feed, [message]);
    return answered;
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
