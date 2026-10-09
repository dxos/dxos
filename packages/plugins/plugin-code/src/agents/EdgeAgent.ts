//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as acp from '@agentclientprotocol/sdk';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Option from 'effect/Option';
import * as Atom from 'effect/reactivity/Atom';
import type * as RpcClient from 'effect/rpc/RpcClient';
import * as Schema from 'effect/Schema';
import type * as Scope from 'effect/Scope';

import { type MakeTurnProducer, type TurnRequest } from '@dxos/agent-runtime';
import * as Capability from '@dxos/app-framework/Capability';
import { AiAssistantError, type Chat } from '@dxos/assistant';
import { type Client } from '@dxos/client';
import { type RemoteProcessManager, accessTokenResolverFromEdge } from '@dxos/compute-runtime';
import * as Credential from '@dxos/compute/Credential';
import * as Process from '@dxos/compute/Process';
import * as Trace from '@dxos/compute/Trace';
import { Annotation, Database, Feed, Obj, Query } from '@dxos/echo';
import { EdgeProcessControl } from '@dxos/edge-compute';
import { invariant } from '@dxos/invariant';
import { type SpaceId } from '@dxos/keys';
import { AccessToken } from '@dxos/link';
import { log } from '@dxos/log';
import * as AssistantCapabilities from '@dxos/plugin-assistant/AssistantCapabilities';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { isManagedAccessToken } from '@dxos/protocols';
import { type ContentBlock, Message, Repo } from '@dxos/types';

import { AgentError } from '../errors.ts';
import * as EdgeProtocol from './EdgeProtocol.ts';
import * as Projection from './Projection.ts';
import * as Workspace from './Workspace.ts';

/** How often a running turn's events are read. */
const POLL_INTERVAL = Duration.seconds(1);

/** Foreign-key source under which a chat records the EDGE process that runs it. */
export const processKeySource = (agent: string): string => `edge-process:${agent}`;

/**
 * Foreign-key source under which a chat records the turn it is waiting on: a client that closed
 * mid-turn leaves it behind, and the next client picks that turn up instead of prompting again.
 */
export const turnKeySource = (agent: string): string => `edge-turn:${agent}`;

export type Definition = {
  /** The harness id chats name (`chat.session.harness`). */
  id: string;
  label: string;
  icon: string;
  /** Permission mode a new session starts in, read when the chat's process is spawned; EDGE's default is `auto`. */
  mode?: () => string | undefined;
  /**
   * Whether nobody answers the agent (the default): it is told never to ask, and EDGE denies a
   * permission request on the spot rather than parking it in the chat.
   */
  unattended?: boolean;
  /**
   * The environment lent to the agent for each turn, read from the chat's space: its Claude credential and
   * any service tokens, by the variable the agent reads each as. A token EDGE custodies is resolved
   * through it.
   */
  credentials: Effect.Effect<Record<string, string>, never, Database.Service | Credential.AccessTokenResolver>;
};

/**
 * A coding agent EDGE runs in a sandbox container (compute-service's coding-agent process), as the
 * agent-registry entry a plugin contributes. The session lives on EDGE: it keeps working with no client
 * connected, and EDGE restarts the container and resumes the turn when the agent dies or stalls. A turn
 * here submits the prompt and folds the process's outputs into the chat as they arrive.
 */
export const make = (
  definition: Definition,
): Effect.Effect<AssistantCapabilities.Agent, never, Scope.Scope | Capability.Service> =>
  Effect.gen(function* () {
    const manager = yield* Capability.Service;
    let cached: { client: Client; control: ProcessControl } | undefined;
    const control = (): ProcessControl | undefined => {
      const client = manager.getAll(ClientCapabilities.Client).at(0);
      if (!client) {
        return undefined;
      }
      if (cached?.client !== client) {
        cached = { client, control: fromRemoteControl(EdgeProcessControl.fromClient(client)) };
      }
      return cached.control;
    };

    // Resolves a token EDGE custodies (the GitHub App's) through the signed-in client.
    const accessTokens = accessTokenResolverFromEdge(() => {
      const client = manager.getAll(ClientCapabilities.Client).at(0);
      invariant(client, 'no client to resolve the access token through');
      return client.edge.http;
    });

    const options: Options = { definition, control, accessTokens };
    return {
      id: definition.id,
      label: definition.label,
      icon: definition.icon,
      availability: Atom.make<AssistantCapabilities.AgentAvailability>({ available: true }),
      makeTurnProducer: makeTurnProducer(options),
      respond: (response) =>
        respond(options, response).pipe(
          Effect.catch((error) =>
            Effect.sync(() => {
              log.warn('request not answered', { chat: response.chat.id, error });
              return false;
            }),
          ),
        ),
    } satisfies AssistantCapabilities.Agent;
  });

/** What a turn needs of EDGE's process routes: the verbs it calls, and the process's RPC group. */
export type ProcessControl = Pick<RemoteProcessManager.Control, 'spawn' | 'submitInput' | 'readEvents'> & {
  readonly rpc: (
    target: RemoteProcessManager.ProcessTarget,
  ) => Effect.Effect<RpcClient.RpcClient<EdgeProtocol.ControlRpcs>, never, Scope.Scope>;
};

export const fromRemoteControl = (control: RemoteProcessManager.Control): ProcessControl => ({
  spawn: (request) => control.spawn(request),
  submitInput: (request) => control.submitInput(request),
  readEvents: (request) => control.readEvents(request),
  rpc: (target) => control.makeRpcClient({ ...target, group: EdgeProtocol.Control }),
});

export type Options = {
  definition: Definition;
  control: () => ProcessControl | undefined;
  /** Resolves the space's server-custodied tokens; without it, only tokens the space holds are lent. */
  accessTokens?: Layer.Layer<Credential.AccessTokenResolver>;
};

/** The chat's process, and where to reach it. */
type Target = { control: ProcessControl; spaceId: SpaceId; pid: Process.ID };

const makeTurnProducer =
  (options: Options): MakeTurnProducer =>
  ({ chat, feed }) =>
    Effect.succeed({
      // The agent's tools are its own, in the container.
      getSkills: () => [],
      runTurn: (request: TurnRequest) =>
        runTurn(options, { chat, feed }, request).pipe(
          Effect.mapError((cause) => new AiAssistantError({ message: cause.message, cause })),
        ),
    });

/** One turn of the EDGE agent against a chat. */
export const runTurn = (
  options: Options,
  { chat, feed }: { chat: Chat.Chat; feed: Feed.Feed },
  request: TurnRequest,
): Effect.Effect<Message.Message[], AgentError, Database.Service | Trace.TraceService> =>
  Effect.gen(function* () {
    const started = Date.now();
    const target = yield* ensureProcess(options, chat);
    const rpc = yield* target.control.rpc(target);
    const env = yield* options.definition.credentials.pipe(
      Effect.provide(options.accessTokens ?? Credential.AccessTokenResolver.notAvailable),
    );
    yield* rpc
      .provideCredentials({ env })
      .pipe(
        Effect.catch((error) =>
          error._tag === 'InvalidCredentials'
            ? Effect.fail(new AgentError({ message: `EDGE refused the agent's credentials: ${error.message}` }))
            : Effect.die(error),
        ),
      );

    // A turn some client started and never saw end (Composer closed mid-turn) ran on without it. This
    // prompt is that turn redelivered, so it is picked up where it is rather than sent as a new one.
    const pending = pendingTurnOf(chat, options.definition.id);
    const turnId = pending?.turnId ?? Obj.ID.random();
    // Read from the current end, so a turn shows only what it caused; a picked-up turn from its own start.
    const start =
      pending?.cursor ?? (yield* target.control.readEvents({ ...target, cursor: Number.MAX_SAFE_INTEGER })).cursor;
    let cursor = start;
    // The agent's messages the earlier client already added; replaying the turn produces them again.
    let folded = 0;
    const record = () =>
      Obj.update(chat, (chat) => {
        Obj.deleteKeys(chat, turnKeySource(options.definition.id));
        Obj.getMeta(chat).keys.push({
          source: turnKeySource(options.definition.id),
          id: encodePendingTurn({ turnId, cursor: start, folded }),
        });
      });

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

    /** Adds what the agent produced, past what an earlier client already added for this turn. */
    const fold = (messages: Message.Message[]) =>
      Effect.gen(function* () {
        const fresh = messages.slice(Math.max(0, (pending?.folded ?? 0) - folded));
        folded += messages.length;
        if (fresh.length > 0) {
          yield* append(fresh);
          record();
        }
      });

    if (!pending) {
      yield* append([Message.make({ sender: 'user', blocks: promptBlocks(request.prompt) })]);
    }
    // Recorded before the prompt goes, so a client that closes right after still leaves it behind; the
    // prompt is sent again on pick-up, since EDGE drops a repeat of the same key.
    record();
    yield* target.control.submitInput({
      ...target,
      input: { _tag: 'prompt', turnId, text: promptText(request.prompt) } satisfies EdgeProtocol.Input,
      idempotencyKey: turnId,
    });

    const projection = new Projection.TurnProjection();
    const handle = (output: EdgeProtocol.Output) =>
      Effect.gen(function* () {
        switch (output._tag) {
          case 'status':
            if (output.status === 'restarting') {
              log.info('coding agent restarting', { chat: chat.id, detail: output.detail });
              yield* Trace.emitRequestPhase('calling-tool', { detail: `Restarting: ${output.detail ?? ''}` });
            }
            return false;
          case 'update': {
            if (output.turnId !== turnId || !isSessionUpdate(output.update)) {
              return false;
            }
            yield* fold(projection.apply(output.update));
            const partial = projection.partial;
            if (partial) {
              yield* Trace.write(Trace.PartialBlock, { ...partial, role: 'assistant' });
            }
            return false;
          }
          case 'permission': {
            if (output.turnId !== turnId || !isPermissionRequest(output.request)) {
              return false;
            }
            const block: ContentBlock.Request = {
              _tag: 'request',
              requestId: output.requestId,
              title: output.request.toolCall.title ?? 'Allow this action?',
              toolCallId: output.request.toolCall.toolCallId,
              options: output.request.options.map(({ optionId, name, kind }) => ({ id: optionId, label: name, kind })),
              ...(output.resolution && {
                resolution:
                  output.resolution.optionId === null
                    ? { outcome: 'cancelled' as const }
                    : { outcome: 'selected' as const, optionId: output.resolution.optionId },
              }),
            };
            yield* fold([
              ...projection.reveal(output.request.toolCall.toolCallId),
              Message.make({ sender: 'assistant', blocks: [block] }),
            ]);
            return false;
          }
          case 'turn-end': {
            if (output.turnId !== turnId) {
              return false;
            }
            yield* fold(
              projection.finish({
                stopReason: toStopReason(output.stopReason),
                durationMs: Date.now() - started,
              }),
            );
            if (output.error !== undefined) {
              return yield* Effect.fail(new AgentError({ message: output.error }));
            }
            return true;
          }
        }
      });

    while (true) {
      const page = yield* target.control.readEvents({ ...target, cursor });
      cursor = page.cursor;
      for (const event of page.events) {
        if (event._tag !== 'output') {
          continue;
        }
        const output = Schema.decodeUnknownOption(EdgeProtocol.Output)(event.data);
        if (Option.isSome(output) && (yield* handle(output.value))) {
          return produced;
        }
      }
      if (ENDED.has(page.snapshot.state)) {
        return yield* Effect.fail(
          new AgentError({ message: `The agent's process ended (${page.snapshot.state.toLowerCase()}).` }),
        );
      }
      yield* Effect.sleep(POLL_INTERVAL);
    }
  }).pipe(
    Effect.scoped,
    // However this client sees the turn end, nothing is left to pick up; only a client that vanished
    // mid-turn, which runs no finalizer, leaves the record behind.
    Effect.ensuring(
      Effect.sync(() => Obj.update(chat, (chat) => Obj.deleteKeys(chat, turnKeySource(options.definition.id)))),
    ),
    // Interrupting the turn cancels it on EDGE; the session stays.
    Effect.onInterrupt(() =>
      Effect.gen(function* () {
        const pid = processOf(chat, options.definition.id);
        const control = options.control();
        const spaceId = Obj.getDatabase(chat)?.spaceId;
        if (pid && control && spaceId) {
          yield* control.submitInput({ spaceId, pid, input: { _tag: 'cancel' } satisfies EdgeProtocol.Input });
        }
      }),
    ),
  );

/** Answers a request block the agent parked: hands the choice to EDGE, then records it. */
const respond = (
  options: Options,
  { chat, message, requestId, optionId }: AssistantCapabilities.AgentResponse,
): Effect.Effect<boolean, AgentError, Database.Service> =>
  Effect.gen(function* () {
    const target = yield* ensureProcess(options, chat);
    const rpc = yield* target.control.rpc(target);
    const { answered } = yield* rpc.respondPermission({ requestId, optionId }).pipe(Effect.orDie);
    Obj.update(message, (message) => {
      for (const block of message.blocks) {
        if (block._tag === 'request' && block.requestId === requestId && block.resolution === undefined) {
          block.resolution = answered ? { outcome: 'selected', optionId } : { outcome: 'cancelled' };
        }
      }
    });
    const feed = yield* Database.load(chat.feed).pipe(Effect.option);
    if (Option.isSome(feed)) {
      yield* Feed.append(feed.value, [message]);
    }
    return answered;
  }).pipe(Effect.scoped);

/** The chat's process, spawned on its first turn and recorded on the chat for every later one. */
const ensureProcess = (options: Options, chat: Chat.Chat): Effect.Effect<Target, AgentError, Database.Service> =>
  Effect.gen(function* () {
    const { definition } = options;
    const control = options.control();
    const spaceId = Obj.getDatabase(chat)?.spaceId;
    if (!control || !spaceId) {
      return yield* Effect.fail(new AgentError({ message: `${definition.label} needs a space and a connection.` }));
    }
    const recorded = processOf(chat, definition.id);
    if (recorded) {
      return { control, spaceId, pid: recorded };
    }
    const mode = definition.mode?.();
    const repositories = yield* checkoutsOf(chat);
    const snapshot = yield* control.spawn({
      spaceId,
      key: EdgeProtocol.PROCESS_KEY,
      name: `${definition.label}: ${chat.name ?? chat.id}`,
      annotations: Schema.decodeUnknownSync(Annotation.Dictionary)({
        [EdgeProtocol.Annotation.unattended]: definition.unattended ?? true,
        ...(mode !== undefined && { [EdgeProtocol.Annotation.mode]: mode }),
        ...(repositories.length > 0 && { [EdgeProtocol.Annotation.repositories]: repositories }),
      }),
      // A spawn redelivered after a lost answer reaches the same process.
      idempotencyKey: `${definition.id}:${chat.id}`,
    });
    Obj.update(chat, (chat) => {
      Obj.getMeta(chat).keys.push({ source: processKeySource(definition.id), id: snapshot.pid });
    });
    return { control, spaceId, pid: snapshot.pid };
  });

const processOf = (chat: Chat.Chat, agent: string): Process.ID | undefined => {
  const id = Obj.getKeys(chat, processKeySource(agent)).at(-1)?.id;
  return id === undefined ? undefined : Process.ID.make(id);
};

/**
 * The repositories the chat's project names, as the process checks them out: the project's `repo`,
 * then its `repositories`, each once. Read when the process is spawned, so the sandbox's checkout
 * is the project's at the chat's start.
 */
export const checkoutsOf = (
  chat: Chat.Chat,
): Effect.Effect<EdgeProtocol.RepositoryCheckout[], never, Database.Service> =>
  Effect.gen(function* () {
    const project = Workspace.projectOf(chat);
    const refs = [...(project?.repo ? [project.repo] : []), ...(project?.repositories ?? [])];
    const repos = yield* Effect.forEach(refs, (ref) => Database.load(ref).pipe(Effect.option));
    const checkouts: EdgeProtocol.RepositoryCheckout[] = [];
    for (const repo of repos) {
      if (Option.isNone(repo)) {
        continue;
      }
      const url = cloneUrl(repo.value);
      if (checkouts.some((checkout) => checkout.url === url)) {
        continue;
      }
      // Two repositories of the same name from different owners each get a directory of their own.
      const name = checkouts.some((checkout) => checkout.name === repo.value.name)
        ? `${repo.value.owner}-${repo.value.name}`
        : repo.value.name;
      checkouts.push({ name, url, ...(repo.value.defaultBranch && { branch: repo.value.defaultBranch }) });
    }
    return checkouts;
  });

const GITHUB_HOST = 'github.com';

const NO_CREDENTIALS: Record<string, string> = {};

/**
 * The space's GitHub connection as the environment the agent's `git` and `gh` read: a token EDGE custodies
 * (the GitHub App's) is resolved through it. None, or one that cannot be resolved, leaves the checkout to
 * public repositories.
 */
export const githubCredentials: Effect.Effect<
  Record<string, string>,
  never,
  Database.Service | Credential.AccessTokenResolver
> = Effect.gen(function* () {
  const tokens = yield* Database.query(Query.type(AccessToken.AccessToken)).run;
  const accessToken = tokens.find((token) => token.source === GITHUB_HOST);
  if (!accessToken) {
    return NO_CREDENTIALS;
  }
  const token = isManagedAccessToken(accessToken.token)
    ? yield* Credential.AccessTokenResolver.resolve({ spaceId: yield* Database.spaceId, accessTokenId: accessToken.id })
    : accessToken.token;
  const env: Record<string, string> = { GITHUB_TOKEN: token, GH_TOKEN: token };
  return env;
}).pipe(
  Effect.catchCause((cause) =>
    Effect.sync(() => {
      log.warn('no GitHub credential', { cause });
      return NO_CREDENTIALS;
    }),
  ),
);

/** A repository's HTTPS clone URL: its own URL when it is hosted elsewhere, GitHub's otherwise. */
const cloneUrl = (repo: Repo.Repo): string => {
  const own = repo.url ? URL.parse(repo.url) : null;
  return own && own.hostname !== GITHUB_HOST ? own.href : `https://github.com/${Repo.fullName(repo)}.git`;
};

type PendingTurn = { turnId: string; cursor: number; folded: number };

const encodePendingTurn = ({ turnId, cursor, folded }: PendingTurn): string => `${turnId}:${cursor}:${folded}`;

/** The turn the chat recorded as still running on EDGE, if a client closed before it ended. */
const pendingTurnOf = (chat: Chat.Chat, agent: string): PendingTurn | undefined => {
  const id = Obj.getKeys(chat, turnKeySource(agent)).at(-1)?.id;
  const [turnId, cursor, folded] = id?.split(':') ?? [];
  return turnId && cursor !== undefined && folded !== undefined
    ? { turnId, cursor: Number(cursor), folded: Number(folded) }
    : undefined;
};

const ENDED: ReadonlySet<Process.State> = new Set([
  Process.State.SUCCEEDED,
  Process.State.FAILED,
  Process.State.TERMINATED,
]);

const STOP_REASONS: ReadonlySet<string> = new Set<acp.StopReason>([
  'end_turn',
  'max_tokens',
  'max_turn_requests',
  'refusal',
  'cancelled',
]);

const toStopReason = (stopReason: string): acp.StopReason => (isStopReason(stopReason) ? stopReason : 'end_turn');

const isStopReason = (value: string): value is acp.StopReason => STOP_REASONS.has(value);

const isSessionUpdate = (value: unknown): value is acp.SessionUpdate =>
  typeof value === 'object' && value !== null && 'sessionUpdate' in value && typeof value.sessionUpdate === 'string';

const isPermissionRequest = (value: unknown): value is acp.RequestPermissionRequest =>
  typeof value === 'object' &&
  value !== null &&
  'toolCall' in value &&
  typeof value.toolCall === 'object' &&
  value.toolCall !== null &&
  'options' in value &&
  Array.isArray(value.options);

const promptBlocks = (prompt: TurnRequest['prompt']): ContentBlock.Any[] =>
  typeof prompt === 'string' ? [{ _tag: 'text', text: prompt }] : [...prompt];

/** Composer prompt blocks as the agent's text: text as text, anything else left out. */
const promptText = (prompt: TurnRequest['prompt']): string =>
  promptBlocks(prompt)
    .flatMap((block) => (block._tag === 'text' ? [block.text] : []))
    .join('\n\n');
