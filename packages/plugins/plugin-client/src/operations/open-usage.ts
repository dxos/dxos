//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { GraphPath, LayoutOperation } from '@dxos/app-toolkit';
import * as Operation from '@dxos/compute/Operation';

import { Account } from '../types';
import { OpenUsage } from './definitions';

const handler: Operation.WithHandler<typeof OpenUsage> = OpenUsage.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      yield* Operation.invoke(LayoutOperation.SwitchWorkspace, { subject: GraphPath.getSpacePath(Account.id) });
      yield* Operation.invoke(LayoutOperation.Open, {
        subject: [GraphPath.getSpacePath(Account.id, Account.Usage)],
      });
    }),
  ),
);

export default handler;
