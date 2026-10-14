//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as acp from '@agentclientprotocol/sdk';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';

import { log } from '@dxos/log';

import { AgentError } from '../errors.ts';

/** What the turn in progress hears from its session. */
export type TurnSink = {
  onUpdate: (update: acp.SessionUpdate) => void;
  /** A tool call waiting for a person; answered later through {@link Session.respond}. */
  onPermission: (request: acp.RequestPermissionRequest) => void;
};

export type OpenOptions = {
  stream: acp.Stream;
  cwd: string;
  /** The agent's own session id from an earlier run, to continue rather than start over. */
  resume?: string;
  mcpServers?: acp.McpServer[];
  /** Permission mode to start in, when the agent offers it. */
  mode?: string;
  /** Agent-specific session options, sent as the session's `_meta`. */
  meta?: Record<string, unknown>;
};

/** One agent process and the ACP session it hosts. */
export type Session = {
  readonly sessionId: string;
  /** Whether {@link OpenOptions.resume} was honoured rather than a fresh session started; false too when the agent no longer has it. */
  readonly resumed: boolean;
  /** Runs one turn. Interrupting it cancels the turn in the agent and refuses its open requests. */
  prompt(prompt: acp.ContentBlock[], sink: TurnSink): Effect.Effect<acp.PromptResponse, AgentError>;
  /** Answers an open permission request; false when it is no longer open. */
  respond(requestId: string, optionId: string | undefined): boolean;
  /** Ends the connection, which ends the agent process. */
  close(): void;
  /** Resolves when the connection ends, from either side. */
  readonly closed: Promise<void>;
};

const CANCELLED: acp.RequestPermissionResponse = { outcome: { outcome: 'cancelled' } };

/** The id a request is answered by: its tool call, which is unique within a session. */
export const requestId = (request: acp.RequestPermissionRequest): string => request.toolCall.toolCallId;

/**
 * Connects to an agent over `stream`, then starts a session in `cwd` or reloads `resume`. A reload
 * replays the agent's history as updates, which no turn is listening to, so they are dropped here:
 * the chat already holds that transcript. A session the agent no longer has starts over.
 */
export const open = ({
  stream,
  cwd,
  resume,
  mcpServers = [],
  mode,
  meta,
}: OpenOptions): Effect.Effect<Session, AgentError> =>
  Effect.gen(function* () {
    let sink: TurnSink | undefined;
    const pending = new Map<string, (response: acp.RequestPermissionResponse) => void>();
    const cancelPending = () => {
      for (const resolve of pending.values()) {
        resolve(CANCELLED);
      }
      pending.clear();
    };

    const connection = acp
      .client({ name: 'composer' })
      .onNotification(acp.methods.client.session.update, ({ params }) => {
        sink?.onUpdate(params.update);
      })
      .onRequest(
        acp.methods.client.session.requestPermission,
        ({ params }) =>
          new Promise<acp.RequestPermissionResponse>((resolve) => {
            if (!sink) {
              resolve(CANCELLED);
              return;
            }
            pending.set(requestId(params), resolve);
            sink.onPermission(params);
          }),
      )
      .connect(stream);
    // Nothing can answer a request once the agent is gone.
    void connection.closed.then(cancelPending);

    const request = <T>(label: string, run: () => Promise<T>) =>
      Effect.tryPromise({
        try: run,
        catch: (cause) => new AgentError({ message: `ACP ${label} failed`, cause }),
      });

    const fresh = request('session/new', () =>
      connection.agent.request(acp.methods.agent.session.new, { cwd, mcpServers, _meta: meta }),
    ).pipe(Effect.map((created) => ({ ...created, resumed: false })));

    const started = yield* Effect.gen(function* () {
      const initialized = yield* request('initialize', () =>
        connection.agent.request(acp.methods.agent.initialize, {
          protocolVersion: acp.PROTOCOL_VERSION,
          clientCapabilities: {},
        }),
      );
      const opened =
        resume !== undefined && initialized.agentCapabilities?.loadSession === true
          ? yield* request('session/load', () =>
              connection.agent.request(acp.methods.agent.session.load, {
                sessionId: resume,
                cwd,
                mcpServers,
                _meta: meta,
              }),
            ).pipe(
              Effect.map((loaded) => ({ sessionId: resume, modes: loaded?.modes ?? undefined, resumed: true })),
              Effect.catch((error) => (isMissing(error.cause) ? fresh : Effect.fail(error))),
            )
          : yield* fresh;
      if (mode && opened.modes?.availableModes.some((available) => available.id === mode)) {
        yield* request('session/set_mode', () =>
          connection.agent.request(acp.methods.agent.session.setMode, { sessionId: opened.sessionId, modeId: mode }),
        );
      }
      return opened;
    }).pipe(
      // A session that never opened has no owner to close it, so its agent process would run on.
      Effect.onExit((exit) => (Exit.isFailure(exit) ? Effect.sync(() => connection.close()) : Effect.void)),
    );

    const sessionId = started.sessionId;
    return {
      sessionId,
      resumed: started.resumed,
      closed: connection.closed,
      close: () => {
        cancelPending();
        connection.close();
      },
      respond: (id, optionId) => {
        const resolve = pending.get(id);
        if (!resolve) {
          return false;
        }
        pending.delete(id);
        resolve(optionId === undefined ? CANCELLED : { outcome: { outcome: 'selected', optionId } });
        return true;
      },
      prompt: (prompt, turnSink) =>
        Effect.suspend(() => {
          sink = turnSink;
          return request('session/prompt', () =>
            connection.agent.request(acp.methods.agent.session.prompt, { sessionId, prompt }),
          );
        }).pipe(
          Effect.onInterrupt(() =>
            Effect.sync(() => {
              // The agent must hear that open requests were refused, or it waits on them forever.
              cancelPending();
              void connection.agent
                .notify(acp.methods.agent.session.cancel, { sessionId })
                .catch((error) => log.warn('cancel not delivered', { sessionId, error }));
            }),
          ),
          Effect.ensuring(
            Effect.sync(() => {
              sink = undefined;
            }),
          ),
        ),
    } satisfies Session;
  });

/** Whether the agent refused a reload because it no longer has the session (its transcript was removed). */
const isMissing = (cause: unknown): boolean =>
  cause instanceof acp.RequestError && cause.code === acp.RequestError.resourceNotFound().code;
