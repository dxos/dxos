//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { ClientService } from '@dxos/client';

import { getLocalSandboxBackend } from '#local-backend';

import { makeEdgeSandboxBackend } from './edge-backend.ts';
import { createSandboxClient } from './sandbox-url.ts';
import { type SandboxBackend, SandboxError } from './SandboxBackend.ts';

/** Environment variable selecting the backend: `local` runs sandboxes on this machine, anything else on EDGE. */
export const SANDBOX_BACKEND_ENV = 'DX_SANDBOX_BACKEND';

/**
 * The backend the operation handlers run against. EDGE unless `DX_SANDBOX_BACKEND=local`, which
 * needs a runtime that can spawn processes (Node or Bun); asking for it elsewhere is an error
 * rather than a silent fall back to EDGE, since the caller chose local to keep work off the network.
 *
 * The client is looked up only for EDGE, so a local sandbox runs where no DXOS client exists.
 */
export const resolveSandboxBackend: Effect.Effect<SandboxBackend, SandboxError> = Effect.suspend(() => {
  const preference = typeof process === 'undefined' ? undefined : process.env?.[SANDBOX_BACKEND_ENV];
  if (preference === 'local') {
    const local = getLocalSandboxBackend();
    return local
      ? Effect.succeed(local)
      : Effect.fail(
          new SandboxError({ message: `${SANDBOX_BACKEND_ENV}=local, but this runtime cannot run local sandboxes.` }),
        );
  }
  return Effect.serviceOption(ClientService).pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => Effect.fail(new SandboxError({ message: 'EDGE sandboxes need a DXOS client.' })),
        onSome: (client) =>
          Effect.try({
            try: () => makeEdgeSandboxBackend(createSandboxClient(client)),
            catch: (cause) =>
              new SandboxError({ message: cause instanceof Error ? cause.message : String(cause), cause }),
          }),
      }),
    ),
  );
});
