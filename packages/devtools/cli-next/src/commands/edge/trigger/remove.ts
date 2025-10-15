//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { DXN } from '@dxos/echo';
import { DatabaseService, FunctionTrigger } from '@dxos/functions';

import { withDatabase } from '../../../util';
import { Common } from '../../options';

import { TriggerId } from './options';

export const remove = Command.make(
  'remove',
  {
    spaceId: Common.spaceId,
    id: TriggerId,
  },
  ({ spaceId, id }) =>
    Effect.gen(function* () {
      const dxn = DXN.fromLocalObjectId(id);
      const trigger = yield* DatabaseService.resolve(dxn, FunctionTrigger);
      yield* DatabaseService.remove(trigger);
      yield* Console.log('Removed trigger', trigger.id);
    }).pipe(withDatabase(spaceId)),
).pipe(Command.withDescription('Remove a trigger.'));
