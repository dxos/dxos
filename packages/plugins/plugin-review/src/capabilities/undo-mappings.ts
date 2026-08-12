//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as UndoMapping from '@dxos/app-framework/UndoMapping';

import { meta } from '#meta';

import * as CommentOperation from '../types/CommentOperation';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(Capabilities.UndoMapping, [
      UndoMapping.make({
        operation: CommentOperation.Delete,
        inverse: CommentOperation.Restore,
        deriveContext: (_input, output) => {
          if (!output.thread || !output.anchor) {
            return;
          }
          return {
            thread: output.thread,
            anchor: output.anchor,
          };
        },
        message: ['thread-deleted.label', { ns: meta.profile.key }],
      }),
      UndoMapping.make({
        operation: CommentOperation.DeleteMessage,
        inverse: CommentOperation.RestoreMessage,
        deriveContext: (input, output) => {
          if (!output.message || output.messageIndex === undefined) {
            return;
          }
          return {
            anchor: input.anchor,
            message: output.message,
            messageIndex: output.messageIndex,
          };
        },
        message: ['message-deleted.label', { ns: meta.profile.key }],
      }),
    ]);
  }),
);
