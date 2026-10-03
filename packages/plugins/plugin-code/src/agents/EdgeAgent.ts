//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as acp from '@agentclientprotocol/sdk';
import * as Duration from 'effect/Duration';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Atom from 'effect/reactivity/Atom';
import type * as RpcClient from 'effect/rpc/RpcClient';
import * as Schema from 'effect/Schema';
import type * as Scope from 'effect/Scope';

import { type MakeTurnProducer, type TurnRequest } from '@dxos/agent-runtime';
import * as Capability from '@dxos/app-framework/Capability';
import { AiAssistantError, type Chat } from '@dxos/assistant';
import { type Client } from '@dxos/client';
import { Process } from '@dxos/compute';
import { type RemoteProcessManager } from '@dxos/compute-runtime';
import * as Trace from '@dxos/compute/Trace';
import { Annotation, Database, Feed, Obj } from '@dxos/echo';
import { EdgeProcessControl } from '@dxos/edge-compute';
import { type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import * as AssistantCapabilities from '@dxos/plugin-assistant/AssistantCapabilities';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import { type ContentBlock, Message } from '@dxos/types';

import { AgentError } from '../errors.ts';
import * as EdgeProtocol from './EdgeProtocol.ts';
import * as Projection from './Projection.ts';

/** How often a running turn's events are read. */
const POLL_INTERVAL = Duration.seconds(1);

/** Foreign-key source under which a chat records the EDGE process that runs it. */
export const processKeySource = (agent: string): string => `edge-process:${agent}`;

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
  /** The Anthropic credential lent to the agent for each turn; read from the chat's space. */
  credential: Effect.Effect<EdgeProtocol.AnthropicCredential | undefined, never, Database.Service>;
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

    const options: Options = { definition, control };
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
    const lendCredential = Effect.gen(function* () {
      const credential = yield* options.definition.credential;
      if (credential) {
        yield* rpc.provideAuth(credential).pipe(Effect.orDie);
      } else {
        log.warn('no Anthropic credential to lend the agent', { chat: chat.id });
      }
    });
    yield* lendCredential;

    // Read from the current end, so a turn shows only what it caused.
    let cursor = (yield* target.control.readEvents({ ...target, cursor: Number.MAX_SAFE_INTEGER })).cursor;

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
    const turnId = Obj.ID.random();
    yield* target.control.submitInput({
      ...target,
      input: { _tag: 'prompt', turnId, text: promptText(request.prompt) } satisfies EdgeProtocol.Input,
      idempotencyKey: turnId,
    });

    const projection = new Projection.TurnProjection();
    const handle = (output: EdgeProtocol.Output) =>
      Effect.gen(function* () {
        switch (output._tag) {
          case 'auth-required':
            yield* lendCredential;
            return false;
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
            yield* append(projection.apply(output.update));
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
            yield* append([
              ...projection.reveal(output.request.toolCall.toolCallId),
              Message.make({ sender: 'assistant', blocks: [block] }),
            ]);
            return false;
          }
          case 'turn-end': {
            if (output.turnId !== turnId) {
              return false;
            }
            yield* append(
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
const ensureProcess = (options: Options, chat: Chat.Chat): Effect.Effect<Target, AgentError> =>
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
    const snapshot = yield* control.spawn({
      spaceId,
      key: EdgeProtocol.PROCESS_KEY,
      name: `${definition.label}: ${chat.name ?? chat.id}`,
      annotations: Schema.decodeUnknownSync(Annotation.Dictionary)({
        [EdgeProtocol.Annotation.unattended]: definition.unattended ?? true,
        ...(mode !== undefined && { [EdgeProtocol.Annotation.mode]: mode }),
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
