//
// Copyright 2026 DXOS.org
//

import * as Command from 'effect/cli/Command';

import { changelog } from './changelog.ts';
import { features } from './features.ts';
import { lint } from './lint.ts';
import { qa } from './qa.ts';
import { review } from './review.ts';
import { index } from './spec-index.ts';

export * from './changelog.ts';
export * from './errors.ts';
export * from './features.ts';
export * from './lint.ts';
export * from './qa.ts';
export * from './qa-lint.ts';
export * from './review.ts';
export * from './spec-index.ts';

/** The `deus` command tree: run standalone by `bin/deus.ts` and mounted by the `dx` CLI as `dx deus`. */
export const deus = Command.make('deus').pipe(
  Command.withDescription('Tools for Deus `.mdl` specs.'),
  Command.withSubcommands([changelog, features, index, lint, qa, review]),
);
