//
// Copyright 2026 DXOS.org
//

import * as FileSystem from '@effect/platform/FileSystem';
import * as Path from '@effect/platform/Path';
import type * as Terminal from '@effect/platform/Terminal';
import type * as Console from 'effect/Console';
import * as Layer from 'effect/Layer';

import type { XtermBridge } from './bridge';
import * as XtermConsole from './console';
import * as XtermTerminal from './terminal';

/**
 * The browser counterpart to `BunContext.layer`.
 *
 * `CliApp.Environment` is only `FileSystem | Path | Terminal`: `Path` is already pure JS upstream
 * and the CLI's browser-safe commands never touch the filesystem, leaving `Terminal` as the sole
 * service needing a real implementation. `Console` is layered in as well so command output and the
 * CLI's own ANSI help text land in the terminal instead of the devtools console.
 */
export type Provided = Terminal.Terminal | FileSystem.FileSystem | Path.Path | Console.Console;

export const layer = (bridge: XtermBridge): Layer.Layer<Provided> =>
  Layer.mergeAll(XtermTerminal.layer(bridge), XtermConsole.layer(bridge), FileSystem.layerNoop({}), Path.layer);
