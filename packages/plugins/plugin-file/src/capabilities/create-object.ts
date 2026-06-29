//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { Type } from '@dxos/echo';
import { SpaceCapabilities, SpaceOperation } from '@dxos/plugin-space';

import { File, FileAction, FileOperation } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
      id: Type.getTypename(File.File),
      inputSchema: FileAction.CreateFileSchema,
      createObject: (props, options) =>
        Effect.gen(function* () {
          const { object } = yield* Operation.invoke(FileOperation.Create, { ...props, db: options.db });
          return yield* Operation.invoke(SpaceOperation.AddObject, {
            object,
            target: options.target,
            targetNodeId: options.targetNodeId,
          });
        }),
    });
  }),
);
