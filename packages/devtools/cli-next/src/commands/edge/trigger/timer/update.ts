//
// Copyright 2025 DXOS.org
//

import { Command, Options } from '@effect/cli';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { DXN, Filter, Obj, Ref } from '@dxos/echo';
import { DatabaseService, FunctionTrigger, FunctionType, getUserFunctionIdInMetadata } from '@dxos/functions';

import { withDatabase } from '../../../../util';
import { Common } from '../../../options';
import { Enabled, Input, TriggerId } from '../options';

import { Cron } from './options';

export const update = Command.make(
  'update',
  {
    spaceId: Common.spaceId,
    id: TriggerId,
    enabled: Enabled,
    functionId: Common.functionId.pipe(Options.optional),
    cron: Cron.pipe(Options.optional),
    input: Input.pipe(Options.optional),
  },
  ({ spaceId, id, enabled, functionId, cron, input }) =>
    Effect.gen(function* () {
      const dxn = DXN.fromLocalObjectId(id);
      const trigger = yield* DatabaseService.resolve(dxn, FunctionTrigger);
      if (trigger.spec?.kind !== 'timer') {
        throw new Error('Trigger is not a timer');
      }

      trigger.enabled = enabled;
      if (Option.isSome(cron)) {
        trigger.spec.cron = cron.value;
      }
      if (Option.isSome(input)) {
        trigger.input = input.value;
      }
      if (Option.isSome(functionId)) {
        const { objects: functions } = yield* DatabaseService.runQuery(Filter.type(FunctionType));
        const fn = functions.find((fn) => getUserFunctionIdInMetadata(Obj.getMeta(fn)) === functionId.value);
        if (!fn) {
          throw new Error(`Function not found: ${functionId.value}`);
        }
        trigger.function = Ref.make(fn);
      }

      yield* Console.log('Updated trigger', trigger.id);
    }).pipe(withDatabase(spaceId)),
).pipe(Command.withDescription('Update a timer trigger.'));
