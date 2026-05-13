//
// Copyright 2024 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { SpaceOperation } from '@dxos/plugin-space';
import { SpaceCapabilities } from '@dxos/plugin-space';

import { WnfsOperation } from '#types';
import { WnfsAction, WnfsFile } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
      id: WnfsFile.WnfsFile.typename,
      inputSchema: WnfsAction.UploadFileSchema,
      // TODO(wittjosiah): Would be nice if icon could change based on the type of the file.
      createObject: (props, options) =>
        Effect.gen(function* () {
          const { object } = yield* Operation.invoke(WnfsOperation.CreateFile, { ...props, db: options.db });
          return yield* Operation.invoke(SpaceOperation.AddObject, {
            object,
            target: options.target,
            hidden: true,
            targetNodeId: options.targetNodeId,
          });
        }),
    });
  }),
);
