//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';

const handlers = OperationHandlerSet.lazy([
  SpaceOperation.Share.pipe(Operation.lazyHandler(() => import('../operations/share.ts'))),
]);

export default Capability.makeModule(() =>
  Effect.succeed(Capability.contribute(Capabilities.OperationHandler, handlers)),
);
