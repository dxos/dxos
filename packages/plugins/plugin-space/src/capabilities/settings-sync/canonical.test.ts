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
import { ClientService } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { Annotation, Filter, Obj, Ref } from '@dxos/echo';

import { Canonical } from './canonical.ts';

const NS = 'org.dxos.plugin.markdown';

/** A profile with its settings space ready, which is where the canonical object lives. */
const settingsSpace = Effect.fnUntraced(function* () {
  const client = yield* ClientService;
  yield* Effect.tryPromise(() => client.halo.createIdentity());
  yield* Effect.tryPromise(() => client.addTypes([AppSettings.AppSettings]));
  const { settingsSpace } = yield* AppSpace.setupIdentitySpaces(client);
  yield* Effect.promise(() => settingsSpace.waitUntilReady());
  return settingsSpace;
});

const settingsObjects = (space: Space) =>
  Effect.promise(() => space.db.query(Filter.type(AppSettings.AppSettings)).run());

describe('Canonical', () => {
  it.effect('names the object it creates, so the next device finds it rather than making its own', () =>
    Effect.gen(function* () {
      const space = yield* settingsSpace();

      const first = yield* Canonical.resolve(space);
      const named = Annotation.get(space.properties, AppAnnotation.AppSettingsAnnotation).pipe(Option.getOrUndefined);
      expect(named).toBeDefined();

      // A second resolve is the next device reading the same replicated properties.
      const second = yield* Canonical.resolve(space);
      expect(second.settings.id).toBe(first.settings.id);
      expect(yield* settingsObjects(space)).toHaveLength(1);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('adopts the annotated object, and the values it wrote to its own come with it', () =>
    Effect.gen(function* () {
      const space = yield* settingsSpace();

      // This device created one and wrote to it before the account named the other.
      const mine = yield* Canonical.resolve(space);
      Obj.update(mine.settings, (settings) => {
        AppSettings.setValue({ shared: settings.shared, local: {} }, NS, 'folding', true);
      });

      // The other device's object arrives and wins the annotation.
      const theirs = space.db.add(AppSettings.make());
      Obj.update(theirs, (theirs) => {
        AppSettings.setValue({ shared: theirs.shared, local: {} }, NS, 'toolbar', false);
      });
      Obj.update(space.properties, (properties) => {
        Annotation.set(properties, AppAnnotation.AppSettingsAnnotation, Ref.make(theirs));
      });

      expect(yield* mine.follow()).toBe(true);
      expect(mine.settings.id).toBe(theirs.id);
      // The winner keeps its own value and adopts the one only the loser held.
      expect(Obj.getSnapshot(mine.settings).shared[NS]).toEqual({ toolbar: false, folding: true });
    }).pipe(Effect.provide(TestLayer)),
  );

  // Against a plain object every write lands; against an ECHO proxy the record has to be read back
  // after it is created, so this only fails with a real database behind it.
  it.effect('keeps the first key written to a namespace that did not exist', () =>
    Effect.gen(function* () {
      const space = yield* settingsSpace();
      const canonical = yield* Canonical.resolve(space);

      Obj.update(canonical.settings, (settings) => {
        AppSettings.setValue({ shared: settings.shared, local: {} }, NS, 'toolbar', true);
      });

      expect(Obj.getSnapshot(canonical.settings).shared[NS]).toEqual({ toolbar: true });
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('reports no move when the annotation already names the object in hand', () =>
    Effect.gen(function* () {
      const space = yield* settingsSpace();
      const canonical = yield* Canonical.resolve(space);

      expect(yield* canonical.follow()).toBe(false);
    }).pipe(Effect.provide(TestLayer)),
  );

  it.effect('converges a profile that duplicated before the annotation existed', () =>
    Effect.gen(function* () {
      const space = yield* settingsSpace();

      // Two objects, no annotation: what a pre-annotation profile looks like on disk.
      const first = space.db.add(AppSettings.make());
      const second = space.db.add(AppSettings.make());
      const lowest = [first, second].sort((left, right) => left.id.localeCompare(right.id))[0];

      const canonical = yield* Canonical.resolve(space);

      expect(canonical.settings.id).toBe(lowest.id);
      expect(yield* settingsObjects(space)).toHaveLength(2);
    }).pipe(Effect.provide(TestLayer)),
  );
});
