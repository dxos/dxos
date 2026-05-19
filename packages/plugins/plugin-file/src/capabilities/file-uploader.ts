//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { runAndForwardErrors } from '@dxos/effect';
import { SpaceOperation } from '@dxos/plugin-space';

import { FileOperation } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;

    return Capability.contributes(AppCapabilities.FileUploader, (db, file) => {
      const { invoke } = capabilities.get(Capabilities.OperationInvoker);
      const program = Effect.gen(function* () {
        const { object } = yield* invoke(FileOperation.Create, { db, file });
        yield* invoke(SpaceOperation.AddObject, { target: db, object });
        return {
          name: object.name ?? file.name,
          type: object.type,
        };
      });

      return runAndForwardErrors(program);
    });
  }),
);
