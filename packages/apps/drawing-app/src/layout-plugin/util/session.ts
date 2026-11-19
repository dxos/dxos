//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as ContainerModel from '@dxos/app-toolkit/ContainerModel';
import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { Database } from '@dxos/echo';
import type * as Drawing from '@dxos/plugin-illustrator/Drawing';

import { getLastSpace } from '../../shared/index.ts';
import { rootCollectionRule } from '../capabilities/default-parent.ts';

/** Waits for the client and creates the anonymous identity when there is none (spec F-2.1, F-2.3). */
export const ensureIdentity = Effect.fn('ensureIdentity')(function* (client: Client) {
  yield* Effect.promise(() => client.waitUntilInitialized());
  if (!client.halo.identity.get()) {
    yield* Effect.promise(() => client.halo.createIdentity());
  }
});

export const createSpace = Effect.fn('createSpace')(function* (client: Client, name: string) {
  const space = yield* Effect.promise(() => client.spaces.create({ name }));
  yield* Effect.promise(() => space.waitUntilReady());
  return space;
});

/** The space a URL names when it is in this browser, else the last one opened, else any (spec F-2.2, F-8.2). */
export const startSpace = Effect.fn('startSpace')(function* (client: Client, preferredId?: string) {
  const spaces = client.spaces.get();
  const lastId = getLastSpace();
  const space = spaces.find(({ id }) => id === preferredId) ?? spaces.find(({ id }) => id === lastId) ?? spaces[0];
  if (!space) {
    return undefined;
  }
  yield* Effect.promise(() => space.waitUntilReady());
  return space;
});

/** Unlinks the drawing from every collection that lists it, so Composer's navigator keeps no dangling row, then deletes it. */
export const removeDrawing = async (space: Space, drawing: Drawing.Drawing) => {
  const collections = await space.db.query(ContainerModel.containing(drawing)).run();
  for (const collection of collections) {
    ContainerModel.unlink({ container: ContainerModel.collection(collection), object: drawing });
  }
  space.db.remove(drawing);
};

/** Files a new drawing into the space's root collection, as Composer files one (spec F-4.2). */
export const fileDrawing = Effect.fn('fileDrawing')(function* (space: Space, drawing: Drawing.Drawing) {
  const target = yield* rootCollectionRule.resolve(drawing).pipe(Effect.provide(Database.layer(space.db)));
  if (target) {
    yield* ContainerModel.add({ object: drawing, target }).pipe(Effect.provide(Database.layer(space.db)));
  }
});
