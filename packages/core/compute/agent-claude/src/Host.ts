//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { query } from '@anthropic-ai/claude-agent-sdk';
import type { SDKMessage, SDKPermissionDenial } from '@anthropic-ai/claude-agent-sdk';
import * as Effect from 'effect/Effect';
import * as Stream from 'effect/Stream';

import { Message } from '@dxos/types';

import { AgentHostError } from './errors.ts';
import * as Options from './Options.ts';
import * as Projection from './Projection.ts';

export type RunOptions = Options.MakeOptions & {
  prompt: string;
};

export type SessionOptions = {
  /** SDK session this one continues, or — with {@link SessionOptions.fork} — branches from. */
  resume?: string;
  /** Branch instead of continuing: the first turn is issued with `forkSession`, earning a new id. */
  fork?: boolean;
};

/**
 * One Claude Agent SDK conversation, projected into ECHO messages.
 *
 * Stateful across turns in two ways: the projector correlates tool results with calls made in
 * earlier turns (the SDK omits the name on results), and the session id captured from the SDK's
 * frames is replayed as `resume` so a second turn sees the first one's history rather than starting
 * a fresh conversation.
 */
export class Session {
  readonly #projector = new Projection.Projector();
  #sessionId: string | undefined;
  #forkNext: boolean;

  constructor({ resume, fork = false }: SessionOptions = {}) {
    this.#sessionId = resume;
    this.#forkNext = fork && resume !== undefined;
  }

  /** The SDK session backing this conversation, once a turn has reported one. */
  get sessionId(): string | undefined {
    return this.#sessionId;
  }

  /** Permission denials recorded so far; complete once a run's stream has drained. */
  get denials(): readonly SDKPermissionDenial[] {
    return this.#projector.denials;
  }

  /**
   * A new conversation branching from this one's history at its current head.
   *
   * The branch replays the ancestor prefix and then diverges — the SDK's own tree primitive, and the
   * counterpart to `SessionLink` on the ECHO side.
   */
  fork(): Session {
    return new Session({ resume: this.#sessionId, fork: true });
  }

  /**
   * Runs one turn, emitting messages as the SDK produces them.
   *
   * The SDK yields an `AsyncGenerator` — the platform boundary this wraps — and frames that carry no
   * conversation content (session init, stream deltas, control traffic) are dropped rather than
   * projected into empty messages.
   */
  run({ prompt, ...options }: RunOptions): Stream.Stream<Message.Message, AgentHostError> {
    // Suspended so the session id and fork flag are read when the stream is consumed, not when it is
    // described — a run built before an earlier one drained would otherwise resume the wrong point.
    return Stream.suspend(() => {
      const resume = this.#sessionId;
      const forkSession = this.#forkNext;
      // A fork applies only to the turn that branches; the turns after it continue the new session.
      this.#forkNext = false;

      return Stream.fromAsyncIterable(
        query({ prompt, options: Options.make({ ...options, resume, forkSession }) }),
        (cause) => new AgentHostError({ cause, context: { cwd: options.cwd, resume } }),
      );
    }).pipe(
      Stream.tap((sdk) => Effect.sync(() => this.#captureSession(sdk))),
      Stream.map((sdk) => this.#projector.message(sdk)),
      Stream.filter((message): message is Message.Message => message !== undefined),
    );
  }

  /** A forked turn reports a new id, so tracking the latest frame keeps the branch on its own session. */
  #captureSession(sdk: SDKMessage): void {
    const { session_id: sessionId } = sdk as { session_id?: string };
    if (sessionId) {
      this.#sessionId = sessionId;
    }
  }
}
