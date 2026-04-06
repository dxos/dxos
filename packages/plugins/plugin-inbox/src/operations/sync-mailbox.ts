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
import { invokeFunctionWithTracing } from '@dxos/plugin-automation/hooks';
import { AutomationCapabilities } from '@dxos/plugin-automation/types';

import { meta } from '../meta';

import { SyncMailbox } from './definitions';

const handler: Operation.WithHandler<typeof SyncMailbox> = SyncMailbox.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ mailbox }) {
      const computeRuntime = yield* Capability.get(AutomationCapabilities.ComputeRuntime);
      const db = Obj.getDatabase(mailbox);
      invariant(db);
      const runtime = computeRuntime.getRuntime(db.spaceId);
      const { GmailFunctions } = yield* Effect.promise(() => import('./google/gmail'));
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
            title: ['sync-mailbox-error.title', { ns: meta.id }],
            closeLabel: ['close.label', { ns: meta.id }],
          });
        }),
      );
    }),
  ),
);

export default handler;
