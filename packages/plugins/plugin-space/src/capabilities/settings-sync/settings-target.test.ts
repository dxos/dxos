//
// Copyright 2026 DXOS.org
//

import { describe, expect, it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as AppAnnotation from '@dxos/app-toolkit/AppAnnotation';
import * as AppSettings from '@dxos/app-toolkit/AppSettings';
import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { TestLayer } from '@dxos/cli-util/testing';
import { type Client, ClientService } from '@dxos/client';
import { Annotation } from '@dxos/echo';
import { Expando } from '@dxos/schema';

import { SettingsTarget } from './settings-target.ts';

describe('SettingsTarget', () => {
  it.effect('moves to the space a credential names', () =>
    Effect.gen(function* () {
      const client = yield* ClientService;
      yield* Effect.tryPromise(() => client.halo.createIdentity());
      yield* Effect.tryPromise(() => client.addTypes([Expando.Expando, AppSettings.AppSettings]));
      yield* createSettingsSpace(client);
      yield* createSettingsSpace(client);
      const [canonical, duplicate] = AppSpace.getSettingsSpaces(client);
      // Before any credential, the designation makes this device read the duplicate.
      const defaultSpace = yield* Effect.promise(() => client.spaces.create({ name: AppSpace.DEFAULT_SPACE_NAME }));
      yield* Effect.promise(() => defaultSpace.waitUntilReady());
      AppSpace.setDefaultSpaceId(duplicate, defaultSpace.id);

      const target = yield* SettingsTarget.open(client);
      expect(target.space.id).toBe(duplicate.id);
      const { promise: switched, resolve } = Promise.withResolvers<void>();
      const unfollow = target.follow({ onChange: () => {}, onSwitch: resolve });

      yield* Effect.promise(() => AppSpace.writeSettingsSpaceCredential(client, canonical));
      yield* Effect.promise(() => switched);
      unfollow();

      expect(target.space.id).toBe(canonical.id);
      const named = Annotation.get(canonical.properties, AppAnnotation.AppSettingsAnnotation).pipe(Option.getOrThrow);
      expect(target.current.id).toBe((yield* Effect.promise(() => named.load())).id);
    }).pipe(Effect.provide(TestLayer)),
  );
});

const createSettingsSpace = Effect.fnUntraced(function* (client: Client) {
  const space = yield* Effect.promise(() => client.spaces.create({}, { tags: [AppSpace.SETTINGS_SPACE_TAG] }));
  yield* Effect.promise(() => space.waitUntilReady());
  return space;
});
