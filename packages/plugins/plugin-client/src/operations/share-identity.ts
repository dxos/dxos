//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { LayoutOperation, Paths } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { ObservabilityOperation } from '@dxos/plugin-observability';

import { Account } from '../types';
import { ShareIdentity } from './definitions';

const handler: Operation.WithHandler<typeof ShareIdentity> = ShareIdentity.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      yield* Operation.invoke(LayoutOperation.SwitchWorkspace, { subject: Paths.getSpacePath(Account.id) });
      yield* Operation.invoke(LayoutOperation.Open, {
        subject: [`${Paths.getSpacePath(Account.id)}/${Account.Profile}`],
      });
      yield* Operation.schedule(ObservabilityOperation.SendEvent, { name: 'identity.share' });
    }),
  ),
);

export default handler;
