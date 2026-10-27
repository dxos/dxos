//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as UndoMapping from '@dxos/app-framework/UndoMapping';

import { RecorderOperation } from '#types';

import { RecorderNamespace } from '../namespace.ts';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.UndoMapping, [
      UndoMapping.make({
        operation: RecorderOperation.DeleteTake,
        inverse: RecorderOperation.RestoreTake,
        deriveContext: (_input, output) => output,
        message: ['take-deleted.label', { ns: RecorderNamespace.key }],
      }),
    ]),
  ),
);
