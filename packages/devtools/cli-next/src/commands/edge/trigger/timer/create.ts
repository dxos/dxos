//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as HashMap from 'effect/HashMap';

import { Filter, Obj, Ref } from '@dxos/echo';
import { DatabaseService, Function, Trigger, getUserFunctionIdInMetadata } from '@dxos/functions-runtime';

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
      const { objects: functions } = yield* DatabaseService.runQuery(Filter.type(Function.Function));
      const fn = functions.find((fn) => getUserFunctionIdInMetadata(Obj.getMeta(fn)) === functionId);
      if (!fn) {
        throw new Error(`Function not found: ${functionId}`);
      }

      const trigger = Trigger.make({
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
    }).pipe(withDatabase(spaceId), withTypes([Function.Function, Trigger.Trigger])),
).pipe(Command.withDescription('Create a timer trigger.'));
