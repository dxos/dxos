//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import type * as Terminal from '@effect/platform/Terminal';
import type * as Option from 'effect/Option';

import type { Capability, Plugin } from '@dxos/app-framework';
import type { CommandConfig, SpaceNotFoundError } from '@dxos/cli-util';
import type { ClientService } from '@dxos/client';
import type { Operation } from '@dxos/compute';
import type { Err } from '@dxos/echo';
import type { SpaceId } from '@dxos/keys';

import { add } from './add';
import { query } from './query';
import { remove } from './remove';
import { stats } from './stats';

// NOTE: Explicit annotation required: d.ts emit cannot portably name the inferred @dxos/compute
// types (TS2883). Name the services rather than widening to `any` — the requirement channel is what
// tells a caller which layers it has to provide.
// TODO(wittjosiah): Alias to `db`.
export const database: Command.Command<
  'database',
  ClientService | CommandConfig | Operation.Service | Plugin.Service | Capability.Service | Terminal.Terminal,
  Err.EntityNotFoundError | Error | SpaceNotFoundError,
  {
    readonly subcommand: Option.Option<
      | { readonly spaceId: Option.Option<SpaceId>; readonly typename: Option.Option<string> }
      | { readonly spaceId: Option.Option<SpaceId>; readonly typename: Option.Option<string> }
      | {
          readonly spaceId: Option.Option<SpaceId>;
          readonly typename: Option.Option<string>;
          readonly id: Option.Option<string>;
        }
      | { readonly spaceId: Option.Option<SpaceId> }
    >;
  }
> = Command.make('database').pipe(
  Command.withDescription('Database access.'),
  Command.withSubcommands([add, query, remove, stats]),
);
