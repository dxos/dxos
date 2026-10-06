//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as acp from '@agentclientprotocol/sdk';
import * as Cause from 'effect/Cause';
import * as Clock from 'effect/Clock';
import * as DateTime from 'effect/DateTime';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';
import * as Scope from 'effect/Scope';

import { AgentInput, type AgentProcessDefinition, makeInputMessage } from '@dxos/agent-runtime';
import { Alarm, HarnessControl, type PendingState, SessionStore } from '@dxos/assistant';
import * as Chat from '@dxos/assistant/Chat';
import * as Operation from '@dxos/compute/Operation';
import * as Process from '@dxos/compute/Process';
import * as StorageService from '@dxos/compute/StorageService';
import * as Subprocess from '@dxos/compute/Subprocess';
import * as Trace from '@dxos/compute/Trace';
import { Annotation, Database, Feed } from '@dxos/echo';
import { log } from '@dxos/log';
import * as AcpAgent from '@dxos/plugin-code/AcpAgent';
import { ContentBlock, Message } from '@dxos/types';

/** Key a chat names in `chat.session.process` to run on Claude Code. */
export const CLAUDE_CODE_PROCESS_KEY = 'org.dxos.plugin.claude.process.claude-code';

/** The Claude Code ACP adapter, as installed by `npm install -g @agentclientprotocol/claude-agent-acp`. */
export const DEFAULT_COMMAND: Command = { command: 'claude-agent-acp' };

/** What starts the agent; it runs in the chat's workspace and speaks ACP on its standard streams. */
export type Command = Pick<Subprocess.SpawnOptions, 'command' | 'args' | 'env'>;

/** How the agent runs, less how it is started: the process starts it through {@link Subprocess}. */
export type Options = Omit<AcpAgent.AgentOptions, 'connect'> & {
  command?: Command;
};

/**
 * Runs a chat on Claude Code: a durable process that starts the agent as an operating-system process
 * through {@link Subprocess} and drives one turn per prompt over ACP. Prompts and wake-ups queue on
 * the chat's feed exactly as they do for the assistant's own agent, so a prompt that arrives
 * mid-turn waits its turn and one left by a process that died is redelivered. The agent stays
 * running between turns, so a follow-up does not pay for starting it again.
 */
export const ClaudeCodeProcess = (options: Options): AgentProcessDefinition =>
  Operation.makeDurable(
    {
      key: CLAUDE_CODE_PROCESS_KEY,
      input: AgentInput,
      output: Schema.Void,
      // `SessionStore` reads the queue with typed queries, which match nothing for an unregistered type.
      types: [Chat.Chat, Feed.Feed, Message.Message, Alarm.Alarm],
      services: [Database.Service, Subprocess.Subprocess],
      rpcs: HarnessControl,
    },
    (ctx) =>
      Effect.gen(function* () {
        const chatDxn = Annotation.getDictionary(ctx.params.annotations, Process.TargetAnnotation).pipe(
          Option.getOrUndefined,
        );
        if (chatDxn == null) {
          return yield* Effect.die(new Error('Claude Code process requires spawn options.target set to a Chat DXN.'));
        }
        const chat = yield* Database.resolve(chatDxn, Chat.Chat).pipe(Effect.orDie);
        const feed = yield* Database.load(chat.feed).pipe(Effect.orDie);
        const subprocess = yield* Subprocess.Subprocess;
        const processScope = yield* Effect.scope;
        const clock = yield* Clock.Clock;
        const store = new SessionStore();
        const command = options.command ?? DEFAULT_COMMAND;

        // Each agent gets a scope of its own, so one that exits is cleaned up without waiting for the
        // process, and one still running when the process ends is killed with it.
        const connect: AcpAgent.AgentOptions['connect'] = (cwd, toolsToken) =>
          Effect.gen(function* () {
            const scope = yield* Scope.fork(processScope);
            const child = yield* subprocess
              .spawn({
                ...command,
                cwd,
                env: { ...command.env, ...(toolsToken !== undefined && { [AcpAgent.TOOLS_TOKEN_ENV]: toolsToken }) },
              })
              .pipe(Scope.provide(scope));
            yield* child.exited.pipe(
              Effect.tap((code) => Effect.sync(() => log('claude code exited', { chat: chat.id, code }))),
              Effect.andThen(Scope.close(scope, Exit.void)),
              Effect.forkIn(processScope),
            );
            yield* drainStderr(child.stderr).pipe(Effect.forkIn(scope));
            return acp.ndJsonStream(child.stdin, child.stdout);
          }).pipe(
            Effect.mapError(
              (error) =>
                new AcpAgent.AgentError({ message: `Claude Code did not start: ${error.message}`, cause: error }),
            ),
          );
        const agent: AcpAgent.AgentOptions = { ...options, connect };

        // Prompts this incarnation queued but may not read back yet: a hosted feed is read through an
        // eventually-consistent index, and a prompt missing from that read would never run.
        const unseen = new Map<string, Message.Message>();
        const pendingOf = (state: PendingState): Message.Message[] => {
          for (const message of state.pendingMessages) {
            unseen.delete(message.id);
          }
          return [...state.pendingMessages, ...unseen.values()];
        };

        const enqueue = Effect.fnUntraced(function* (message: Message.Message) {
          unseen.set(message.id, message);
          yield* store.enqueueMessage(feed, message);
          yield* ctx.setAlarm(0);
        });

        /** Arms the process alarm for what is left: now for a queued prompt, at the next wake-up otherwise. */
        const rearm = Effect.gen(function* () {
          const state = yield* store.loadPending(feed);
          if (pendingOf(state).length > 0) {
            return yield* ctx.setAlarm(0);
          }
          const next = state.pendingAlarms[0];
          if (next) {
            yield* ctx.setAlarm(Math.max(0, next.wakeAt - clock.currentTimeMillisUnsafe()));
          }
        });

        const runTurn = Effect.fnUntraced(function* (prompt: readonly ContentBlock.Any[]) {
          yield* Trace.write(Trace.AgentRequestBegin, {});
          yield* AcpAgent.runTurn(agent, { chat, feed }, { prompt: [...prompt] }).pipe(
            Effect.onExit((exit) =>
              Trace.write(Trace.AgentRequestEnd, {
                status: Exit.isSuccess(exit) ? 'success' : Exit.hasInterrupts(exit) ? 'interrupted' : 'error',
                error: Exit.isFailure(exit) ? Cause.pretty(exit.cause) : undefined,
              }),
            ),
          );
        });

        return {
          // Runs on a fresh spawn only: whatever is pending was left by a process that is gone for
          // good (stopped by the user), and redelivering it would re-run a prompt they stopped.
          onSpawn: Effect.fnUntraced(function* () {
            const { pendingMessages } = yield* store.loadPending(feed);
            yield* Effect.forEach(pendingMessages, (message) => store.ack(feed, message), { discard: true });
          }),
          rpcHandlers: yield* HarnessControl.toHandlers({
            setAlarm: Effect.fn(function* ({ at, message }) {
              yield* store.setAlarm(feed, { wakeAt: DateTime.toEpochMillis(at), message: message ?? undefined });
              yield* rearm;
            }),
            enqueueMessage: ({ content }) => enqueue(makeInputMessage(content)),
          }),
          onInput: (input) => enqueue(makeInputMessage(input)),
          // One turn per wake, so a stop between turns lands before the next one starts.
          onAlarm: Effect.fnUntraced(
            function* () {
              const state = yield* store.loadPending(feed);
              const [message] = pendingOf(state);
              const due = state.pendingAlarms.find((alarm) => alarm.wakeAt <= clock.currentTimeMillisUnsafe());
              if (message) {
                // A person speaking again renews the budget for wake-ups the agent schedules itself.
                if (message.sender.role === 'user') {
                  yield* SelfWakesCell.set(0);
                }
                // The turn appends its own user message, so the queue entry leaves the queue view now.
                yield* store.markInFlight(feed, message);
                yield* runTurn(message.blocks);
                unseen.delete(message.id);
                yield* store.ack(feed, message);
              } else if (due) {
                const selfWakes = yield* SelfWakesCell.get;
                if (selfWakes >= Alarm.MAX_SELF_WAKES) {
                  // Acked without a turn, so an agent that keeps rescheduling itself stops until prompted.
                  log.warn('claude code self-wake budget spent, dropping alarm', { wakes: selfWakes });
                } else {
                  yield* SelfWakesCell.set(selfWakes + 1);
                  yield* runTurn([ContentBlock.Text.make({ text: due.message ?? 'Continue.' })]);
                }
                yield* store.ack(feed, due);
              }
              yield* rearm;
            },
            // A failed turn fails the process; the session spawns a fresh one for the next prompt.
            Effect.orDie,
          ),
        };
      }),
  );

/** Wake-ups the agent scheduled for itself since a person last prompted it; bounded by {@link Alarm.MAX_SELF_WAKES}. */
const SelfWakesCell = StorageService.cell(Schema.fromJsonString(Schema.Number), 'selfWakes').pipe(
  StorageService.withDefault(() => 0),
);

/** Logs what the agent writes to stderr, which is where it reports what it cannot say over ACP. */
const drainStderr = (stderr: ReadableStream<Uint8Array>): Effect.Effect<void> =>
  Effect.promise(async () => {
    const reader = stderr.getReader();
    const decoder = new TextDecoder();
    for (let next = await reader.read(); !next.done; next = await reader.read()) {
      const text = decoder.decode(next.value, { stream: true }).trim();
      if (text.length > 0) {
        log('claude code stderr', { text });
      }
    }
  }).pipe(Effect.ignore);
