//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';

import { Account } from '#types';

import * as ClientOperation from '../types/ClientOperation.ts';

const handler: Operation.WithHandler<typeof ClientOperation.OpenUsage> = ClientOperation.OpenUsage.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      yield* Operation.invoke(LayoutOperation.SwitchWorkspace, { subject: GraphPath.getSpacePath(Account.id) });
      yield* Operation.invoke(LayoutOperation.Open, {
        subject: [Account.path(Account.Usage)],
      });
    }),
  ),
);

export default handler;
