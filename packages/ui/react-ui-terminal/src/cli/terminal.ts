//
// Copyright 2026 DXOS.org
//

import * as Terminal from '@effect/platform/Terminal';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Layer from 'effect/Layer';
import * as Mailbox from 'effect/Mailbox';

import type { XtermBridge } from './bridge';
import { isQuitInput } from './input';
import { readLine } from './line-editor';

/**
 * A `@effect/platform` `Terminal` backed by xterm.
 *
 * This is the only service in `CliApp.Environment` without a browser implementation upstream;
 * `Path` is already pure JS and `FileSystem` can be stubbed.
 */
export const make = (bridge: XtermBridge): Terminal.Terminal =>
  Terminal.Terminal.of({
    columns: Effect.sync(() => bridge.columns),
    rows: Effect.sync(() => bridge.rows),
    isTTY: Effect.succeed(true),
    readInput: Effect.gen(function* () {
      const mailbox = yield* Mailbox.make<Terminal.UserInput>();
      const unsubscribe = bridge.subscribe((input) => {
        mailbox.unsafeOffer(input);
        if (isQuitInput(input)) {
          mailbox.unsafeDone(Exit.void);
        }
      });

      yield* Effect.addFinalizer(() => Effect.sync(unsubscribe));
      return mailbox;
    }),
    readLine: readLine(bridge),
    display: (text) => Effect.sync(() => bridge.write(text)),
  });

export const layer = (bridge: XtermBridge): Layer.Layer<Terminal.Terminal> =>
  Layer.succeed(Terminal.Terminal, make(bridge));
