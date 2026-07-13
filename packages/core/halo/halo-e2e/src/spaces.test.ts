//
// Copyright 2026 DXOS.org
//

import { it } from '@effect/vitest';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import { describe } from 'vitest';

import { Space } from '@dxos/halo';
import { SpaceId } from '@dxos/keys';

import { makeClientLayer } from './testing';

describe('Spaces', () => {
  it.effect(
    'creates a space',
    Effect.fn(function* ({ expect }) {
      const info = yield* Space.create({ name: 'notes' });
      expect(SpaceId.isValid(info.id)).toBe(true);

      yield* Space.waitReady(info.id);

      const resolved = yield* Space.get(info.id);
      expect(Option.getOrThrow(resolved).id).toEqual(info.id);
    }, Effect.provide(makeClientLayer())),
  );

  it.effect(
    'lists spaces',
    Effect.fn(function* ({ expect }) {
      const before = yield* Space.list;
      const info = yield* Space.create({ name: 'one' });
      yield* Space.waitReady(info.id);
      const after = yield* Space.list;
      expect(after.length).toEqual(before.length + 1);
    }, Effect.provide(makeClientLayer())),
  );

  it.effect(
    'a fresh space has one (admin) member',
    Effect.fn(function* ({ expect }) {
      const info = yield* Space.create({ name: 'solo' });
      yield* Space.waitReady(info.id);

      const members = yield* Space.members(info.id);
      expect(members).toHaveLength(1);
      expect(members[0].role).toEqual('admin');
    }, Effect.provide(makeClientLayer())),
  );

  it.effect(
    'get returns none for an unknown space',
    Effect.fn(function* ({ expect }) {
      const resolved = yield* Space.get(SpaceId.random());
      expect(Option.isNone(resolved)).toBe(true);
    }, Effect.provide(makeClientLayer())),
  );

  it.effect(
    'exports and imports a space archive',
    Effect.fn(function* ({ expect }) {
      const source = yield* Space.create({ name: 'source' });
      yield* Space.waitReady(source.id);

      const archive = yield* Space.exportSpace(source.id);
      expect(archive.contents.length).toBeGreaterThan(0);

      const imported = yield* Space.importSpace(archive);
      yield* Space.waitReady(imported.id);
      // Import creates a distinct space.
      expect(imported.id).not.toEqual(source.id);
    }, Effect.provide(makeClientLayer())),
  );
});
