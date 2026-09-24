//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Sink from 'effect/Sink';
import * as Stdio from 'effect/Stdio';
import * as Stream from 'effect/Stream';

import type { TerminalBridge } from './bridge.ts';

const decoder = new TextDecoder();

/**
 * Routes process stdout/stderr to the terminal.
 *
 * The CLI writes help and usage errors through `Stdio` rather than `Console`, so a draining stub
 * would swallow exactly the output a shell exists to show. Both streams land in the same terminal,
 * which is what a real one does too.
 */
export const make = (bridge: TerminalBridge): Stdio.Stdio => {
  const sink = Sink.forEach((chunk: string | Uint8Array) =>
    Effect.sync(() => bridge.write(typeof chunk === 'string' ? chunk : decoder.decode(chunk))),
  );

  return Stdio.make({
    args: Effect.succeed([]),
    stdout: () => sink,
    stderr: () => sink,
    stdin: Stream.empty,
    stdoutIsTerminal: Effect.succeed(true),
  });
};

export const layer = (bridge: TerminalBridge): Layer.Layer<Stdio.Stdio> => Layer.succeed(Stdio.Stdio, make(bridge));
