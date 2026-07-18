//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { Blob, Database } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
// Explicit import so the emitted `.d.ts` references the package via its public
// alias instead of a relative `node_modules` path (TS2883).
// eslint-disable-next-line unused-imports/no-unused-imports
import type { OperationInvoker } from '@dxos/operation';
import { SpaceOperation } from '@dxos/plugin-space';

import { FileOperation } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const { invoke } = yield* Capabilities.OperationInvoker;

    return [
      Capability.provide(AppCapabilities.FileUploader, (db, file) => {
        const program = Effect.gen(function* () {
          const { object } = yield* invoke(FileOperation.Create, { db, file });
          yield* invoke(SpaceOperation.AddObject, { target: db, object });
          const blob = yield* Database.load(object.data);
          const urlOption = yield* Blob.url(blob).pipe(Effect.provide(Database.layer(db)));
          return {
            name: object.name ?? file.name,
            type: blob.type ?? 'application/octet-stream',
            ...(Option.isSome(urlOption) ? { url: urlOption.value } : {}),
          };
        });

        return EffectEx.runAndForwardErrors(program);
      }),
    ];
  }),
);
