//
// Copyright 2026 DXOS.org
//

import * as FileSystem from '@effect/platform/FileSystem';
import * as Path from '@effect/platform/Path';
import type * as Terminal from '@effect/platform/Terminal';
import * as Layer from 'effect/Layer';

import type { XtermBridge } from './bridge';
import * as XtermConsole from './console';
import * as XtermTerminal from './terminal';

/**
 * The browser counterpart to `BunContext.layer`.
 *
 * `CliApp.Environment` is only `FileSystem | Path | Terminal`: `Path` is already pure JS upstream
 * and the CLI's browser-safe commands never touch the filesystem, leaving `Terminal` as the sole
 * service needing a real implementation. The console override is merged in too — contributing no
 * services of its own — so command output and the CLI's ANSI help text land in the terminal
 * instead of the devtools console.
 */
export type Provided = Terminal.Terminal | FileSystem.FileSystem | Path.Path;

export const layer = (bridge: XtermBridge): Layer.Layer<Provided> =>
  Layer.mergeAll(XtermTerminal.layer(bridge), XtermConsole.layer(bridge), FileSystem.layerNoop({}), Path.layer);
