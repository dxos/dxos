//
// Copyright 2026 DXOS.org
//

import * as Args from '@effect/cli/Args';
import * as Command from '@effect/cli/Command';
import * as Options from '@effect/cli/Options';
import * as Console from 'effect/Console';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { CommandConfig, FormBuilder, print } from '@dxos/cli-util';
import { ClientService } from '@dxos/client';

import { authorize, initialize, saveSession } from './client';

export const connect = Command.make(
  'connect',
  {
    url: Args.text({ name: 'url' }).pipe(
      Args.withDescription('MCP server URL (e.g. https://space-agent.dxos.workers.dev).'),
    ),
    spaceId: Options.text('space-id').pipe(
      Options.withDescription('Space(s) to bring into the session context; repeatable. Defaults to the first space.'),
      Options.repeated,
    ),
    haloSpaceId: Options.text('halo-space-id').pipe(
      Options.withDescription('HALO space id. Only needed when the identity has no registered agent.'),
      Options.optional,
    ),
  },
  Effect.fn(function* ({ url, spaceId, haloSpaceId }) {
    const { json, profile } = yield* CommandConfig;
    const client = yield* ClientService;

    const identity = client.halo.identity.get();
    if (!identity) {
      return yield* Effect.fail(new Error('Identity not available. Run `dx account login` first.'));
    }

    // The server scopes the session to these spaces; default to the profile's first space so the
    // common case ("connect this space") needs no flags.
    const spaceIds = spaceId.length > 0 ? [...spaceId] : client.spaces.get().map((space) => space.id);
    if (spaceIds.length === 0) {
      return yield* Effect.fail(new Error('No spaces available. Create one with `dx space create`.'));
    }

    const session = yield* Effect.tryPromise(() =>
      authorize({
        serverUrl: url,
        identityKey: identity.identityKey.toHex(),
        spaceIds,
        haloSpaceId: Option.getOrUndefined(haloSpaceId),
      }),
    );
    yield* Effect.tryPromise(() => initialize(session));
    yield* Effect.promise(() => saveSession(profile, session));

    if (json) {
      yield* Console.log(
        JSON.stringify({ serverUrl: session.serverUrl, identityKey: session.identityKey, spaceIds }, null, 2),
      );
    } else {
      const builder = FormBuilder.make({ title: 'Connected' }).pipe(
        FormBuilder.set('server', session.serverUrl),
        FormBuilder.set('identity', session.identityKey.slice(0, 16)),
        FormBuilder.set('spaces', spaceIds.join(', ')),
      );
      yield* Console.log(print(FormBuilder.build(builder)));
    }
  }),
).pipe(Command.withDescription('Connect to an MCP server (OAuth 2.1 + PKCE) and store the session.'));
