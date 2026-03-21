//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { LayoutOperation } from '@dxos/app-toolkit';
import { Obj, Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { Operation } from '@dxos/operation';
import { AutomationCapabilities, invokeFunctionWithTracing } from '@dxos/plugin-automation';

import { meta } from '../meta';

import { SyncMailbox } from './definitions';
import { GmailFunctions } from './google/gmail';

export default SyncMailbox.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ mailbox }) {
      const computeRuntime = yield* Capability.get(AutomationCapabilities.ComputeRuntime);
      const db = Obj.getDatabase(mailbox);
      invariant(db);
      const runtime = computeRuntime.getRuntime(db.spaceId);
      yield* Effect.tryPromise(() =>
        runtime.runPromise(
          invokeFunctionWithTracing(GmailFunctions.Sync, {
            mailbox: Ref.make(mailbox),
          }),
        ),
      ).pipe(
        Effect.catchAll((error) => {
          log.catch(error);
          return Operation.invoke(LayoutOperation.AddToast, {
            id: `${meta.id}/sync-mailbox-error`,
            icon: 'ph--warning--regular',
            duration: 5_000,
            title: ['sync mailbox error title', { ns: meta.id }],
            closeLabel: ['close label', { ns: meta.id }],
          });
        }),
      );
    }),
  ),
);
