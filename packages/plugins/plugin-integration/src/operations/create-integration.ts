//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { Integration } from '../types';
import { CreateIntegration } from './definitions';

const handler: Operation.WithHandler<typeof CreateIntegration> = CreateIntegration.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ accessToken, name }) {
      const integration = Integration.make({
        name,
        accessToken,
        targets: [],
      });
      return yield* Database.add(integration);
    }),
  ),
);

export default handler;
