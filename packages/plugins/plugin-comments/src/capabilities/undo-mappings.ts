//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability, UndoMapping } from '@dxos/app-framework';

import { meta } from '#meta';
import { CommentOperation } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(Capabilities.UndoMapping, [
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
