//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { Deploy } from './definitions';
import { ScriptDeploymentService } from './services';

export default Deploy.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ script }) {
      const loaded = yield* Database.load(script);
      const deploymentService = yield* ScriptDeploymentService;
      return yield* deploymentService.deploy(loaded);
    }),
  ),
);
