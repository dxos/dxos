//
// Copyright 2026 DXOS.org
//

import * as BunServices from '@effect/platform-bun/BunServices';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Client, Config, ConfigService } from '@dxos/client';
import { EffectEx } from '@dxos/effect';

/**
 * Creates a HALO identity and one space in the CLI profile rooted at `$HOME`, then prints
 * `{"spaceId":"..."}` on stdout.
 *
 * A test needs this because the CLI has no offline way to reach that state: `halo create` was
 * withdrawn in favour of `dx account signup`, which needs the hub, and until an identity exists
 * every space and database command fails with `IdentityNotInitializedError`. Run as its own
 * process through the same `ConfigService.load` path `bin.ts` uses, so the storage it writes is
 * the storage a later `dx` invocation opens.
 */
const program = Effect.gen(function* () {
  const loaded = yield* ConfigService.load({ config: Option.none(), profile: process.env.DX_PROFILE ?? 'default' });
  // Only the profile's data root is carried over, so `dx` later opens the same storage; every
  // service is left out on purpose. Identity creation joins the identity's own swarm
  // unconditionally, and against a configured EDGE endpoint that is a 10s timeout and a thrown
  // error on any machine without reachable signaling — an offline fixture must not need the
  // network to be up.
  const dataRoot = loaded.values.runtime?.client?.storage?.dataRoot;
  const config = new Config({ version: 1, runtime: { client: { storage: { dataRoot } } } });

  const client = new Client({ config });
  yield* Effect.promise(() => client.initialize());
  yield* Effect.promise(() => client.halo.createIdentity({ displayName: 'e2e' }));
  const space = yield* Effect.promise(() => client.spaces.create());
  yield* Effect.promise(() => space.waitUntilReady());
  yield* Effect.promise(() => space.db.flush());
  const spaceId = space.id;
  yield* Effect.promise(() => client.destroy());
  // The only thing written to stdout, so the caller parses it without filtering log lines.
  // Awaited: `process.exit` below would otherwise discard a write still buffered in the pipe,
  // and the caller would see empty output rather than the id.
  yield* Effect.promise(
    () =>
      new Promise<void>((resolve) => {
        process.stdout.write(`${JSON.stringify({ spaceId })}\n`, () => resolve());
      }),
  );
});

// `BunServices.layer` is what `bin.ts` provides: `ConfigService.load` reads the profile off disk
// and fails with "Service not found: effect/platform/FileSystem" without it.
await EffectEx.runPromise(Effect.scoped(Effect.provide(program, BunServices.layer)));
// The client leaves sockets and a worker behind; without this the process lingers past the write.
process.exit(0);
