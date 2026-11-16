//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import { Filter, Key, Obj } from '@dxos/echo';
import { BaseError } from '@dxos/errors';
import { EID } from '@dxos/keys';
import * as Canvas from '@dxos/plugin-canvas/Canvas';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as DrawingOperation from '@dxos/plugin-illustrator/DrawingOperation';
import { toPublicKey } from '@dxos/protocols/buf';

import { type Route, UNTITLED, fileDrawing, getLastDrawing, recordRoute } from '../model/index.ts';
import { updateState } from './update-state.ts';

/**
 * The first diagram of a space this identity created and that has none yet, as the create-space dialog makes. A
 * joined space is never given one: its diagrams may not have arrived yet.
 */
const firstDiagram = Effect.fnUntraced(function* (spaceId: string) {
  const client = yield* Capability.get(ClientCapabilities.Client);
  const space = client.spaces.get().find(({ id }) => id === spaceId);
  const creator = toPublicKey(space?.internal.data.creator);
  const identityKey = toPublicKey(client.halo.identity.get()?.identityKey);
  if (!space || !creator || !identityKey || !creator.equals(identityKey)) {
    return undefined;
  }
  const drawings = yield* Effect.promise(() => space.db.query(Filter.type(Drawing.Drawing)).run());
  if (drawings.length > 0) {
    return undefined;
  }
  const { object } = yield* Operation.invoke(
    DrawingOperation.Create,
    { name: UNTITLED, variant: Canvas.SCENE_SCHEMA },
    { spaceId: space.id },
  );
  const drawing = object as Drawing.Drawing;
  yield* fileDrawing(space, drawing);
  return drawing.id;
});

/** The app shows only diagrams; a follow of someone on another kind of object pauses on this failure. */
class NotADiagramError extends BaseError.extend('NotADiagramError', 'Only a diagram opens in this app.') {}

/** Whether an object in a space is a diagram; one that cannot be loaded yet is not. */
const isDiagram = Effect.fnUntraced(function* (spaceId: Key.SpaceId, objectId: string) {
  const client = yield* Capability.get(ClientCapabilities.Client);
  const space = client.spaces.get().find(({ id }) => id === spaceId);
  if (!space) {
    return false;
  }
  const object = yield* Effect.tryPromise(() =>
    space.db.makeRef(EID.make({ spaceId, entityId: objectId })).load(),
  ).pipe(Effect.orElseSucceed(() => undefined));
  return Obj.instanceOf(Drawing.Drawing, object);
});

/**
 * Opens the space a path names (spec F-8): the diagram it names, else the space's last one here. A new space of
 * one's own opens with one empty diagram (spec F-3.3).
 */
const handler: Operation.WithHandler<typeof LayoutOperation.Open> = LayoutOperation.Open.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ subject }) {
      const [path] = subject;
      const spaceId = path && GraphPath.getSpaceIdFromPath(path);
      if (!spaceId) {
        return subject;
      }
      const last = path.split('/').at(-1);
      const named = last && Key.EntityId.isValid(last) ? last : undefined;
      if (named && !(yield* isDiagram(spaceId, named))) {
        return yield* Effect.fail(new NotADiagramError());
      }
      const drawingId = named ?? getLastDrawing(spaceId) ?? (yield* firstDiagram(spaceId));
      const route: Route = { spaceId, drawingId };
      recordRoute(route, 'push');
      yield* updateState(() => ({ route }));
      return subject;
    }),
  ),
);

export default handler;
