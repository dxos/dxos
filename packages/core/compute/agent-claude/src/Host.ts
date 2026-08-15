//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { query } from '@anthropic-ai/claude-agent-sdk';
import type { SDKPermissionDenial } from '@anthropic-ai/claude-agent-sdk';
import * as Stream from 'effect/Stream';

import { Message } from '@dxos/types';

import { AgentHostError } from './errors';
import * as Options from './Options';
import * as Projection from './Projection';

export type RunOptions = Options.MakeOptions & {
  prompt: string;
};

/**
 * One Claude Agent SDK conversation, projected into ECHO messages.
 *
 * Stateful across turns: the projector correlates tool results with calls made in earlier turns, and
 * denials accumulate for the whole conversation rather than per turn.
 */
export class Session {
  readonly #projector = new Projection.Projector();

  /** Permission denials recorded so far; complete once a run's stream has drained. */
  get denials(): readonly SDKPermissionDenial[] {
    return this.#projector.denials;
  }

  /**
   * Runs one turn, emitting messages as the SDK produces them.
   *
   * The SDK yields an `AsyncGenerator` — the platform boundary this wraps — and frames that carry no
   * conversation content (session init, stream deltas, control traffic) are dropped rather than
   * projected into empty messages.
   */
  run({ prompt, ...options }: RunOptions): Stream.Stream<Message.Message, AgentHostError> {
    return Stream.fromAsyncIterable(
      query({ prompt, options: Options.make(options) }),
      (cause) => new AgentHostError({ cause, context: { cwd: options.cwd } }),
    ).pipe(
      Stream.map((sdk) => this.#projector.message(sdk)),
      Stream.filter((message): message is Message.Message => message !== undefined),
    );
  }
}
