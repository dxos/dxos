//
// Copyright 2025 DXOS.org
//

import { Command, Options } from '@effect/cli';
import { Console, Effect, HashMap } from 'effect';

import { Filter, Obj, Ref } from '@dxos/echo';
import { DatabaseService, FunctionTrigger, FunctionType, getUserFunctionIdInMetadata } from '@dxos/functions';

import { withDatabase, withTypes } from '../../../../util';
import { Common } from '../../../options';
import { Enabled, Input } from '../options';

import { Cron } from './options';

export const create = Command.make(
  'create',
  {
    spaceId: Common.spaceId,
    enabled: Enabled,
    // TODO(dmaretskyi): Should be the ECHO id of the function
    functionId: Common.functionId,
    cron: Cron,
    input: Input.pipe(Options.withDefault(HashMap.empty())),
  },
  ({ spaceId, enabled, functionId, cron, input }) =>
    Effect.gen(function* () {
      const { objects: functions } = yield* DatabaseService.runQuery(Filter.type(FunctionType));
      const fn = functions.find((fn) => getUserFunctionIdInMetadata(Obj.getMeta(fn)) === functionId);
      if (!fn) {
        throw new Error(`Function not found: ${functionId}`);
      }

      const trigger = Obj.make(FunctionTrigger, {
        function: Ref.make(fn),
        enabled,
        spec: {
          kind: 'timer',
          cron,
        },
        input: Object.fromEntries(HashMap.toEntries(input)),
      });
      yield* DatabaseService.add(trigger);
      yield* Console.log('Created trigger', trigger.id);
    }).pipe(withDatabase(spaceId), withTypes([FunctionType, FunctionTrigger])),
).pipe(Command.withDescription('Create a timer trigger.'));
