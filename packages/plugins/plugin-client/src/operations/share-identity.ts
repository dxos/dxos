//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { LayoutOperation, getSpacePath } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';
import { ObservabilityOperation } from '@dxos/plugin-observability/operations';

import { Account } from '../types';
import { ShareIdentity } from './definitions';

const handler: Operation.WithHandler<typeof ShareIdentity> = ShareIdentity.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      yield* Operation.invoke(LayoutOperation.SwitchWorkspace, { subject: getSpacePath(Account.id) });
      yield* Operation.invoke(LayoutOperation.Open, {
        subject: [`${getSpacePath(Account.id)}/${Account.Profile}`],
      });
      yield* Operation.schedule(ObservabilityOperation.SendEvent, { name: 'identity.share' });
    }),
  ),
);

export default handler;
