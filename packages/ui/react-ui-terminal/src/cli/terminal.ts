//
// Copyright 2026 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Layer from 'effect/Layer';
import * as Queue from 'effect/Queue';
import * as Terminal from 'effect/Terminal';

import type { TerminalBridge } from './bridge.ts';
import { isQuitInput } from './input.ts';
import { readLine } from './line-editor.ts';

/**
 * A Effect `Terminal` backed by xterm.
 *
 * This is the only service in `CliApp.Environment` without a browser implementation upstream;
 * `Path` is already pure JS and `FileSystem` can be stubbed.
 */
export const make = (bridge: TerminalBridge): Terminal.Terminal =>
  Terminal.make({
    columns: Effect.sync(() => bridge.columns),
    rows: Effect.sync(() => bridge.rows),
    size: Effect.gen(function* () {
      // Sliding with capacity 1 because `Terminal.size` promises only the latest dimensions.
      const queue = yield* Queue.sliding<Terminal.Size, Cause.Done>(1);
      const offer = () => Queue.offerUnsafe(queue, { columns: bridge.columns, rows: bridge.rows });
      const unsubscribe = bridge.onResize(offer);
      yield* Effect.addFinalizer(() =>
        Effect.sync(() => {
          unsubscribe();
          Queue.endUnsafe(queue);
        }),
      );
      offer();
      return Queue.asDequeue(queue);
    }),
    readInput: Effect.gen(function* () {
      const queue = yield* Queue.unbounded<Terminal.UserInput, Cause.Done>();
      const unsubscribe = bridge.subscribe((input) => {
        Queue.offerUnsafe(queue, input);
        if (isQuitInput(input)) {
          Queue.endUnsafe(queue);
        }
      });

      yield* Effect.addFinalizer(() => Effect.sync(unsubscribe));
      return Queue.asDequeue(queue);
    }),
    readLine: readLine(bridge),
    display: (text) => Effect.sync(() => bridge.write(text)),
  });

export const layer = (bridge: TerminalBridge): Layer.Layer<Terminal.Terminal> =>
  Layer.succeed(Terminal.Terminal, make(bridge));
