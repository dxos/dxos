//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as UndoMapping from '@dxos/app-framework/UndoMapping';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { meta } from '#meta';
import { TaskOperation } from '#types';

export const UndoMappings = AppCapability.undoMappings(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.UndoMapping, [
      UndoMapping.make({
        operation: TaskOperation.DeleteTask,
        inverse: TaskOperation.RestoreTasks,
        deriveContext: (_input, output) => output.restore,
        message: (_input, output) =>
          output.restore.entries.length > 1
            ? ['tasks-deleted.label', { ns: meta.profile.key }]
            : ['task-deleted.label', { ns: meta.profile.key }],
      }),
    ]),
  ),
);
