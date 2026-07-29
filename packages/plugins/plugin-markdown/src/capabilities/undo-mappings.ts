//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability, UndoMapping } from '@dxos/app-framework';
import { CollaborationOperation } from '@dxos/app-toolkit';

// Accept/Reject return the splice (`undo`) that reverses them; the inverse RestoreText re-applies it
// — on the base for accept, on the author's branch for reject.
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(Capabilities.UndoMapping, [
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
