//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as FileSystem from 'effect/FileSystem';
import * as Layer from 'effect/Layer';
import * as Path from 'effect/Path';
import type * as Command from 'effect/unstable/cli/Command';
import * as ChildProcessSpawner from 'effect/unstable/process/ChildProcessSpawner';

import type { XtermBridge } from './bridge.ts';
import * as XtermConsole from './console.ts';
import * as XtermStdio from './stdio.ts';
import * as XtermTerminal from './terminal.ts';

/**
 * The browser counterpart to `BunServices.layer`.
 *
 * Of `Command.Environment`, `Path` is already pure JS upstream and the CLI's browser-safe commands
 * never touch the filesystem or spawn a process, leaving `Terminal` and `Stdio` to implement. The
 * console override is merged in too — contributing no services of its own — so command output and
 * the CLI's ANSI help text land in the terminal instead of the devtools console.
 */
export type Provided = Command.Environment;

const UNAVAILABLE = 'Not available in the browser terminal.';

export const layer = (bridge: XtermBridge): Layer.Layer<Provided> =>
  Layer.mergeAll(
    XtermTerminal.layer(bridge),
    XtermConsole.layer(bridge),
    FileSystem.layerNoop({}),
    Path.layer,
    XtermStdio.layer(bridge),
    Layer.succeed(ChildProcessSpawner.ChildProcessSpawner)(
      ChildProcessSpawner.make(() => Effect.die(new Error(UNAVAILABLE))),
    ),
  );
