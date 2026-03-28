//
// Copyright 2025 DXOS.org
//

import * as Args from '@effect/cli/Args';
import * as Command from '@effect/cli/Command';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';

import { CommandConfig } from '@dxos/cli-util';
import { type InspectIdentityResponse } from '@dxos/protocols';

import { adminRequest, formatAdminError } from '../util';

export const inspect = Command.make(
  'inspect',
  { identityKey: Args.text({ name: 'identityKey' }) },
  Effect.fn(function* ({ identityKey }) {
    const data = yield* adminRequest('GET', `/admin/identities/${identityKey}`).pipe(
      Effect.catchAll((error) => Effect.fail(new Error(formatAdminError(error)))),
    );

    if (yield* CommandConfig.isJson) {
      yield* Console.log(JSON.stringify(data, null, 2));
    } else {
      const result = data as InspectIdentityResponse;
      yield* Console.log(`Identity: ${result.identityKey}`);
      yield* Console.log(`  Recovery:   ${result.hasRecovery ? 'yes' : 'no'}`);
      yield* Console.log(`  Halo space: ${result.haloSpaceId ?? 'n/a'}`);
      yield* Console.log(`  Agent key:  ${result.agentKey ?? 'n/a'}`);
      yield* Console.log(`  Router DO:  ${result.routerDoId}`);
      yield* Console.log(`  Agent DO:   ${result.agentDoId ?? 'n/a'}`);

      if (result.ownedFunctions.length > 0) {
        yield* Console.log(`  Functions:`);
        for (const fn of result.ownedFunctions) {
          yield* Console.log(`    ${fn.name} (${fn.id}) — ${fn.versionCount} version(s)`);
        }
      }

      if (result.spaces.length > 0) {
        yield* Console.log(`  Spaces (${result.spaces.length}):`);
        for (const space of result.spaces) {
          yield* Console.log(`    ${space.spaceId}`);
          for (const dobj of space.durableObjects) {
            yield* Console.log(`      ${dobj.type}: ${dobj.doId}`);
          }
        }
      }
    }
  }),
).pipe(Command.withDescription('Inspect an identity.'));
