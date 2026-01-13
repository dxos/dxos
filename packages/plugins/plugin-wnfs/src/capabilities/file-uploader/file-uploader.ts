//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { runAndForwardErrors } from '@dxos/effect';
import { SpaceOperation } from '@dxos/plugin-space/types';

import { WnfsOperation } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const { invoke } = yield* Capability.get(Common.Capability.OperationInvoker);

    return Capability.contributes(Common.Capability.FileUploader, (db, file) => {
      const program = Effect.gen(function* () {
        const fileInfo = yield* invoke(WnfsOperation.Upload, { db, file });
        const createResult = yield* invoke(WnfsOperation.Create, fileInfo);
        if (createResult?.object) {
          yield* invoke(SpaceOperation.AddObject, { target: db, object: createResult.object });
        }

        return fileInfo;
      });

      return runAndForwardErrors(program);
    });
  }),
);
