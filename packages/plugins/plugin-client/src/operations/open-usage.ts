//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { LayoutOperation, Paths } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';

import { Account } from '../types';
import { OpenUsage } from './definitions';

const handler: Operation.WithHandler<typeof OpenUsage> = OpenUsage.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      yield* Operation.invoke(LayoutOperation.SwitchWorkspace, { subject: Paths.getSpacePath(Account.id) });
      yield* Operation.invoke(LayoutOperation.Open, {
        subject: [`${Paths.getSpacePath(Account.id)}/${Account.Usage}`],
      });
    }),
  ),
);

export default handler;
