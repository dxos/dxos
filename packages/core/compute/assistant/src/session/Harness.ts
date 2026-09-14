//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Context from 'effect/Context';
import * as DateTime from 'effect/DateTime';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import type * as Scope from 'effect/Scope';
import type * as RpcClient from 'effect/unstable/rpc/RpcClient';

import { ServiceNotAvailableError } from '@dxos/compute';
import { ProcessManager } from '@dxos/compute-runtime';
import * as LayerSpec from '@dxos/compute/LayerSpec';
import * as Process from '@dxos/compute/Process';
import { Annotation, Database, EID, Feed, Filter, Obj, type URI } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { BaseError } from '@dxos/errors';
import { type ContentBlock, Message } from '@dxos/types';

import * as Chat from '../types/Chat.ts';
import * as AiContext from './AiContext.ts';
import { type HarnessControlRpcs } from './harness-control.ts';
import { SessionStore } from './SessionStore.ts';

export interface Service {
  /** The conversation {@link AiContext.Binder} (Tier A). */
  binder: Effect.Effect<AiContext.Binder, NotSupportedError>;
  /** The {@link Chat.Chat} the conversation belongs to (Tier A). */
  chat: Effect.Effect<Chat.Chat, NotSupportedError>;
  /** The conversation message history (Tier A). */
  history: Effect.Effect<Message.Message[], NotSupportedError>;
  /** Objects bound to the conversation that match the filter (Tier A). */
  queryContext<T extends Obj.Unknown>(filter: Filter.Filter<T>): Effect.Effect<T[], NotSupportedError>;
  /** Enqueue a message into the owning host's input queue (Tier B). */
  enqueueMessage(options: EnqueueMessageOptions): Effect.Effect<void, NotSupportedError>;
  /** Schedule a self-wake on the owning host (Tier B). */
  setAlarm(options: SetAlarmOptions): Effect.Effect<void, NotSupportedError>;
}

/**
 * Provides access to the controlling harness for tools and operations that are executed by the agent.
 *
 * Replaces AiContextService and AiSessionService.
 */
export class HarnessService extends Context.Service<HarnessService, Service>()('@dxos/assistant/HarnessService') {}

/**
 * Acess current context binder.
 */
export const binder: Effect.Effect<AiContext.Binder, NotSupportedError, HarnessService> = Effect.flatMap(
  HarnessService,
  (service) => service.binder,
);

/**
 * The chat the conversation belongs to.
 *
 * The agent process is bound to its chat (its spawn target), so session-scoped tools resolve the
 * conversation's plan, checklist and instructions from here rather than by looking for a Chat among
 * the bound context objects.
 */
export const getChat: Effect.Effect<Chat.Chat, NotSupportedError, HarnessService> = Effect.flatMap(
  HarnessService,
  (service) => service.chat,
);

/**
 * Query the context using a filter.
 */
export const queryContext = <T extends Obj.Unknown>(
  filter: Filter.Filter<T>,
): Effect.Effect<T[], NotSupportedError, HarnessService> =>
  Effect.flatMap(HarnessService, (service) => service.queryContext(filter));

interface EnqueueMessageOptions {
  content: ContentBlock.Any[];

  // TODO(dmaretskyi): Order: 'first' | 'last'
}

/**
 * Query the session history.
 */
export const history: Effect.Effect<Message.Message[], NotSupportedError, HarnessService> = Effect.flatMap(
  HarnessService,
  (service) => service.history,
);

/**
 * Enqueue a message to the harness.
 */
export const enqueueMessage = (
  options: EnqueueMessageOptions,
): Effect.Effect<void, NotSupportedError, HarnessService> =>
  Effect.flatMap(HarnessService, (service) => service.enqueueMessage(options));

interface SetAlarmOptions {
  at: DateTime.DateTime;
  /**
   * Message to send when the alarm fires.
   */
  message: string | null;
}

export const setAlarm = (options: SetAlarmOptions): Effect.Effect<void, NotSupportedError, HarnessService> =>
  Effect.flatMap(HarnessService, (service) => service.setAlarm(options));

/**
 * Binds skills and/or objects to the conversation context.
 */
export const bindContext = ({
  skills,
  objects,
}: AiContext.BindingProps): Effect.Effect<void, NotSupportedError, HarnessService> =>
  Effect.gen(function* () {
    const sessionBinder = yield* binder;
    yield* Effect.promise(() => sessionBinder.bind({ skills, objects }));
  });

export class NotSupportedError extends BaseError.extend('NotSupportedError', 'Operation not supported') {}

/**
 * Process-affinity {@link LayerSpec} that materialises {@link HarnessService} from the resolution
 * context's `conversation` DXN. Merges the former `AiContext.Service` (Tier A) with live host
 * dispatch (Tier B).
 */
export const layerSpec: LayerSpec.LayerSpec = LayerSpec.make(
  {
    affinity: 'process',
    requires: [Database.Service, ProcessManager.Service],
    provides: [HarnessService],
  },
  (context) =>
    Layer.effect(
      HarnessService,
      Effect.gen(function* () {
        if (!context.conversation) {
          // LayerSpec.make requires a never-failing layer (error channel = never), so typed failure
          // is not possible here. Die with ServiceNotAvailableError to signal a programming error
          // (missing 'conversation' in spawn environment) that callers cannot recover from.
          return yield* Effect.die(
            new ServiceNotAvailableError(HarnessService.key, {
              message: `Service not available: ${HarnessService.key} — process spawn is missing 'conversation' in environment (set via Operation.withInvocationOptions or ProcessManager.spawn environment)`,
            }),
          );
        }
        const conversation = context.conversation;
        const processManager = yield* ProcessManager.Service;
        const runtime = yield* Effect.context<Database.Service>();
        return yield* make({ conversation, processManager, runtime });
      }),
    ),
);

interface MakeOptions {
  conversation: URI.URI;
  processManager: Context.Service.Shape<typeof ProcessManager.Service>;
  runtime: Context.Context<Database.Service>;
}

/**
 * Builds the {@link Service} for a conversation-scoped resolution context. Tier A resolves the
 * conversation feed / {@link AiContext.Binder} once; Tier B looks up the owning host process lazily per call
 * and dispatches over its `Handle.rpc` control surface (raising {@link NotSupportedError} when no
 * live host owns the conversation).
 */
export const make = ({
  conversation,
  processManager,
  runtime,
}: MakeOptions): Effect.Effect<Service, never, Scope.Scope> =>
  Effect.gen(function* () {
    const feed = yield* Database.resolve(EID.parse(conversation), Feed.Feed).pipe(
      Effect.provide(runtime),
      Effect.orDie,
    );
    const boundBinder = yield* EffectEx.acquireReleaseResource(() => new AiContext.Binder({ feed, runtime }));
    // Cached rather than resolved up front: a harness is built for every operation the agent
    // invokes, and most never ask for the chat — resolving one here would put a lookup on the tool
    // path. The agent process is spawned against the chat, so the host is discovered by the chat's
    // URI; a feed with no chat (e.g. a bare `AiSession`) keeps the feed as its own host target.
    const chat = yield* Effect.cached(Chat.loadForFeed(feed).pipe(Effect.provide(runtime)));
    return makeService({
      feed,
      chat: chatOrFail(chat),
      runtime,
      binder: boundBinder,
      owningHost: Effect.flatMap(chat, (chat) =>
        lookupOwningHost(processManager, chat ? Obj.getURI(chat) : conversation),
      ),
    });
  });

interface FromBinderOptions {
  feed: Feed.Feed;
  runtime: Context.Context<Database.Service>;
  binder: AiContext.Binder;
}

/**
 * Builds the {@link Service} from a {@link AiContext.Binder} already opened for the conversation (e.g. the
 * agent's own turn fiber, which has no `ProcessManager.Service` in scope). Tier A is fully served;
 * Tier B raises {@link NotSupportedError} since the live-host control surface is not reachable here.
 */
export const fromBinder = ({ feed, runtime, binder }: FromBinderOptions): Service =>
  makeService({
    feed,
    // Resolved per call rather than up front: this is the synchronous constructor, and the chat is
    // only needed by the tools that ask for it.
    chat: chatOrFail(Chat.loadForFeed(feed).pipe(Effect.provide(runtime))),
    runtime,
    binder,
    owningHost: Effect.fail(new NotSupportedError()),
  });

interface MakeServiceOptions {
  feed: Feed.Feed;
  chat: Effect.Effect<Chat.Chat, NotSupportedError>;
  runtime: Context.Context<Database.Service>;
  binder: AiContext.Binder;
  owningHost: Effect.Effect<RpcClient.RpcClient<HarnessControlRpcs>, NotSupportedError>;
}

const makeService = ({ feed, chat, runtime, binder, owningHost }: MakeServiceOptions): Service => ({
  binder: Effect.succeed(binder),
  chat,
  history: Effect.gen(function* () {
    const messages = yield* Feed.query(feed, Filter.type(Message.Message)).run;
    return yield* new SessionStore().reifyHistory(feed, messages);
  }).pipe(Effect.provide(runtime)),
  queryContext: <T extends Obj.Unknown>(filter: Filter.Filter<T>) =>
    Effect.sync(() => {
      const match = Filter.toPredicate(filter);
      return binder.getObjects().filter(match);
    }),
  enqueueMessage: ({ content }) => owningHost.pipe(Effect.flatMap((rpc) => rpc.enqueueMessage({ content }))),
  setAlarm: ({ at, message }) =>
    owningHost.pipe(Effect.flatMap((rpc) => rpc.setAlarm({ at: DateTime.toUtc(at), message }))),
});

/** A chat-less conversation (e.g. a bare `AiSession` feed) has no chat to hand out. */
const chatOrFail = (chat: Effect.Effect<Chat.Chat | undefined, never>): Effect.Effect<Chat.Chat, NotSupportedError> =>
  Effect.flatMap(chat, (chat) => (chat ? Effect.succeed(chat) : Effect.fail(new NotSupportedError())));

/**
 * Resolves the live host owning `conversation` per call (so a process replacement — e.g. a model
 * switch — is never captured stale) and exposes its `HarnessControl` RPC client.
 */
const lookupOwningHost = (
  processManager: Context.Service.Shape<typeof ProcessManager.Service>,
  conversation: URI.URI,
): Effect.Effect<RpcClient.RpcClient<HarnessControlRpcs>, NotSupportedError> =>
  Effect.gen(function* () {
    const processes = yield* processManager.list({ target: conversation });
    const host = processes.find(
      (process) =>
        !isTerminalProcess(process.status.state) &&
        Option.getOrElse(
          Annotation.getDictionary(process.params.annotations, Process.HarnessHostAnnotation),
          () => false,
        ),
    );
    if (!host) {
      return yield* Effect.fail(new NotSupportedError());
    }
    // The host is discovered by annotation, but the HarnessControl RPC contract is fixed at the
    // spawn site (agent-process declares it as its `rpcs`); narrow the variance-erased
    // `RpcClient<any>` to that contract so the dispatch below is typed. No typed path exists here:
    // the host handle carries `RpcClient<any>` (design spec §4.4) and the concrete definition lives
    // in `@dxos/functions-runtime`, which depends on this package — importing it would cycle.
    return host.rpc as unknown as RpcClient.RpcClient<HarnessControlRpcs>;
  });

// TERMINATING counts as terminal: the handle is already `#finished` and no longer accepts input.
const isTerminalProcess = (state: Process.State): boolean =>
  state === Process.State.SUCCEEDED ||
  state === Process.State.FAILED ||
  state === Process.State.TERMINATED ||
  state === Process.State.TERMINATING;
