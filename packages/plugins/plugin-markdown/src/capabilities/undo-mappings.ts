//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as UndoMapping from '@dxos/app-framework/UndoMapping';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as CollaborationOperation from '@dxos/app-toolkit/CollaborationOperation';

export const UndoMappings = AppCapability.undoMappings(
  Effect.fnUntraced(function* () {
    return Capability.contribute(Capabilities.UndoMapping, [
      UndoMapping.make({
        operation: CollaborationOperation.AcceptChange,
        inverse: CollaborationOperation.RestoreText,
        deriveContext: (input, output) => (output.undo ? { subject: input.subject, ...output.undo } : undefined),
      }),
      UndoMapping.make({
        operation: CollaborationOperation.RejectChange,
        inverse: CollaborationOperation.RestoreText,
        deriveContext: (input, output) =>
          output.undo ? { subject: input.subject, branch: input.branch, ...output.undo } : undefined,
      }),
    ]);
  }),
);
