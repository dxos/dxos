//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { DXN } from '@dxos/echo';
import { Database } from '@dxos/echo';
import { Trigger } from '@dxos/functions';

import { spaceLayer } from '../../../util';
import { Common } from '../../options';

import { TriggerId } from './options';

export const remove = Command.make(
  'remove',
  {
    spaceId: Common.spaceId.pipe(Options.optional),
    id: TriggerId,
  },
  ({ id }) =>
    Effect.gen(function* () {
      const dxn = DXN.fromLocalObjectId(id);
      const trigger = yield* Database.Service.resolve(dxn, Trigger.Trigger);
      yield* Database.Service.remove(trigger);
      yield* Console.log('Removed trigger', trigger.id);
    }),
).pipe(
  Command.withDescription('Remove a trigger.'),
  Command.provide(({ spaceId }) => spaceLayer(spaceId)),
);
