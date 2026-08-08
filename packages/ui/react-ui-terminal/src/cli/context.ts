//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as FileSystem from 'effect/FileSystem';
import * as Layer from 'effect/Layer';
import * as Path from 'effect/Path';
import * as Stdio from 'effect/Stdio';
import type * as Command from 'effect/unstable/cli/Command';
import { ChildProcessSpawner } from 'effect/unstable/process';

import type { XtermBridge } from './bridge';
import * as XtermConsole from './console';
import * as XtermTerminal from './terminal';

/**
 * The browser counterpart to `BunServices.layer`.
 *
 * Of `Command.Environment`, `Path` is already pure JS upstream and the CLI's browser-safe commands
 * never touch the filesystem, spawn a process, or read stdio — leaving `Terminal` as the sole
 * service needing a real implementation. The console override is merged in too — contributing no
 * services of its own — so command output and the CLI's ANSI help text land in the terminal
 * instead of the devtools console.
 */
export type Provided = Command.Environment;

const UNAVAILABLE = 'Not available in the browser terminal.';

export const layer = (bridge: XtermBridge): Layer.Layer<Provided> =>
  Layer.mergeAll(
    XtermTerminal.layer(bridge),
    XtermConsole.layer(bridge),
    FileSystem.layerNoop({}),
    Path.layer,
    Stdio.layerTest({}),
    Layer.succeed(ChildProcessSpawner.ChildProcessSpawner)(
      ChildProcessSpawner.make(() => Effect.die(new Error(UNAVAILABLE))),
    ),
  );
