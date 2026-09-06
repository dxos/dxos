//
// Copyright 2026 DXOS.org
//
// @import-as-namespace
//

import * as Effect from 'effect/Effect';

import type * as Models from './Models.ts';
import type * as Workspace from './Workspace.ts';

/** Placeholder while the dev server lands; `Cli.ts` imports this lazily. */
export const run = (_options: {
  readonly root: string;
  readonly port?: number;
  readonly host?: string;
  readonly model: Models.Selection;
}): Effect.Effect<void, never, Workspace.Services> => Effect.die('not implemented');
