//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { UndoMapping } from '@dxos/app-framework';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as CollaborationOperation from '@dxos/app-toolkit/CollaborationOperation';

// Accept/Reject return the splice (`undo`) that reverses them; the inverse RestoreText re-applies it
// — on the base for accept, on the author's branch for reject.
export default Capability.makeModule(
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
