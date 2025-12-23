//
// Copyright 2025 DXOS.org
//

import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { ClientService } from '@dxos/client';
import { Database, Filter } from '@dxos/echo';
import { Trigger } from '@dxos/functions';

import { CommandConfig, Common, printList, spaceIdWithDefault, spaceLayer } from '@dxos/cli-util';

import { getTriggerRemoteStatus, printTrigger } from './util';

export const list = Command.make(
  'list',
  {
    spaceId: Common.spaceId.pipe(Options.optional),
  },
  Effect.fn(function* ({ spaceId: spaceIdOption }) {
    const { json } = yield* CommandConfig;

    // Fetch local triggers
    const triggers = yield* Database.Service.runQuery(Filter.type(Trigger.Trigger));

    // Fetch remote cron triggers to check availability
    const remoteCronIds = yield* Effect.gen(function* () {
      const client = yield* ClientService;
      const spaceId = yield* spaceIdWithDefault(spaceIdOption);
      const result = yield* Effect.promise(() => client.edge.getCronTriggers(spaceId)).pipe(
        Effect.catchAll(() => Effect.succeed({ cronIds: [] })),
      );
      return result.cronIds;
    });

    // Determine remote status for each trigger
    const triggersWithStatus = triggers.map((trigger) => ({
      trigger,
      remoteStatus: getTriggerRemoteStatus(trigger, remoteCronIds),
    }));

    // Print triggers
    if (json) {
      yield* Console.log(
        JSON.stringify(
          triggersWithStatus.map(({ trigger, remoteStatus }) => ({ ...trigger, remoteStatus })),
          null,
          2,
        ),
      );
    } else {
      if (triggersWithStatus.length === 0) {
        yield* Console.log('No triggers found.');
      } else {
        const items = yield* Effect.all(
          triggersWithStatus.map(({ trigger, remoteStatus }) => printTrigger(trigger, remoteStatus)),
        );
        yield* Console.log(printList(items));
      }
    }
  }),
).pipe(
  Command.withDescription('List triggers configured on EDGE.'),
  Command.provide(({ spaceId }) => spaceLayer(spaceId, true)),
);
