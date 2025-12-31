//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, createIntent } from '@dxos/app-framework';
import { runAndForwardErrors } from '@dxos/effect';
import { SpaceAction } from '@dxos/plugin-space/types';

import { WnfsAction } from '../../types';

export default Capability.makeModule((context) =>
  Effect.succeed(
    Capability.contributes(Common.Capability.FileUploader, (db, file) => {
      const { dispatch } = context.getCapability(Common.Capability.IntentDispatcher);
      const program = Effect.gen(function* () {
        const fileInfo = yield* dispatch(createIntent(WnfsAction.Upload, { db, file }));
        const createResult = yield* dispatch(createIntent(WnfsAction.Create, fileInfo));
        if (createResult?.object) {
          yield* dispatch(createIntent(SpaceAction.AddObject, { target: db, object: createResult.object }));
        }

        return fileInfo;
      });

      return runAndForwardErrors(program);
    }),
  ),
);
