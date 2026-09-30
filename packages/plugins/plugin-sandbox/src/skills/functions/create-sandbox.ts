//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';
import { Database, Obj } from '@dxos/echo';
import { log } from '@dxos/log';

import { Sandbox, SandboxOperation, SandboxService } from '#types';

import { mintAccountToken } from './account-token.ts';

export default SandboxOperation.CreateSandbox.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ name, baseImage, accountAccess = true }) {
      const { db } = yield* Database.Service;

      const sandbox = Sandbox.make({ name, baseImage });
      yield* Database.add(sandbox);

      const sandboxId = sandbox.id;
      const spaceId = db.spaceId;
      const sandboxService = yield* SandboxService.Service;

      const record = yield* sandboxService.create(spaceId, sandboxId, { name, baseImage }).pipe(Effect.orDie);

      Obj.update(sandbox, (sandbox) => {
        sandbox.createdAt = record.createdAt;
        sandbox.expiresAt = record.expiresAt;
        if (record.baseImage) {
          sandbox.baseImage = record.baseImage;
        }
      });

      // Only an app host holds the reader's client; a headless runtime creates the sandbox without a token.
      const capabilities = yield* Effect.serviceOption(Capability.Service);
      const accountTokenEnv =
        accountAccess && Option.isSome(capabilities)
          ? yield* mintAccountToken(sandbox).pipe(
              Effect.provideService(Capability.Service, capabilities.value),
              Effect.tapError((error) => Effect.sync(() => log.warn('account token not minted', { sandboxId, error }))),
              Effect.option,
              Effect.map(Option.getOrUndefined),
            )
          : undefined;

      return { sandboxId: Obj.getURI(sandbox), accountTokenEnv };
    }),
  ),
);
