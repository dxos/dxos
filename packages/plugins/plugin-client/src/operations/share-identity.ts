//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import { ObservabilityOperation } from '@dxos/plugin-observability';

import { Account } from '../types';
import { ShareIdentity } from './definitions';

const handler: Operation.WithHandler<typeof ShareIdentity> = ShareIdentity.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* () {
      yield* Operation.invoke(LayoutOperation.SwitchWorkspace, { subject: GraphPath.getSpacePath(Account.id) });
      yield* Operation.invoke(LayoutOperation.Open, {
        subject: [GraphPath.getSpacePath(Account.id, Account.Profile)],
      });
      yield* Operation.schedule(ObservabilityOperation.SendEvent, { name: 'identity.share' });
    }),
  ),
);

export default handler;
