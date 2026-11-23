//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { ProjectOperation } from '#types';

/**
 * Handlers that drive a mounted editor, kept apart from `ProjectOperationHandlerSet` so the server builds that load
 * that set never bundle CodeMirror's view layer.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(
      Capabilities.OperationHandler,
      OperationHandlerSet.lazy([
        ProjectOperation.ScrollToAnchor.pipe(Operation.lazyHandler(() => import('./scroll-to-anchor.ts'))),
      ]),
    );
  }),
);
