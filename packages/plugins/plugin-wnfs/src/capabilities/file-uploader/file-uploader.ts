//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { runAndForwardErrors } from '@dxos/effect';
import { SpaceOperation } from '@dxos/plugin-space/types';

import { WnfsOperation } from '../../types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Get context for lazy capability access in callbacks.
    const capabilities = yield* Capability.Service;

    return Capability.contributes(AppCapabilities.FileUploader, (db, file) => {
      const { invoke } = capabilities.get(Capabilities.OperationInvoker);
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
