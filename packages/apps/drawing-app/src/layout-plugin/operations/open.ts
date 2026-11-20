//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Semaphore from 'effect/Semaphore';

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

import { type Route, UNTITLED, getLastDrawing } from '../../shared/index.ts';
import { fileDrawing, recordRoute } from '../util/index.ts';
import { updateState } from './update-state.ts';

/** One first-diagram check at a time per space, so two opens of a new space create one diagram between them. */
const firstDiagramLocks = new Map<string, Semaphore.Semaphore>();

const withFirstDiagramLock = (spaceId: string) => {
  let lock = firstDiagramLocks.get(spaceId);
  if (!lock) {
    lock = Semaphore.makeUnsafe(1);
    firstDiagramLocks.set(spaceId, lock);
  }
  return lock.withPermits(1);
};

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
export class NotADiagramError extends BaseError.extend('NotADiagramError', 'Only a diagram opens in this app.') {}

/** Whether an object in a space is a drawing whose canvas is a `Canvas` (spec D-27); one that cannot be loaded yet is not. */
const isDiagram = Effect.fnUntraced(function* (spaceId: Key.SpaceId, objectId: string) {
  const client = yield* Capability.get(ClientCapabilities.Client);
  const space = client.spaces.get().find(({ id }) => id === spaceId);
  if (!space) {
    return false;
  }
  const object = yield* Effect.tryPromise(() =>
    space.db.makeRef(EID.make({ spaceId, entityId: objectId })).load(),
  ).pipe(Effect.orElseSucceed(() => undefined));
  if (!Obj.instanceOf(Drawing.Drawing, object)) {
    return false;
  }
  const canvas = yield* Effect.tryPromise(() => object.canvas.load()).pipe(Effect.orElseSucceed(() => undefined));
  return Canvas.isCanvas(canvas);
});

/**
 * Opens the space a path names (spec F-8): the diagram it names, else the space's last one here. A new space of
 * one's own opens with one empty diagram (spec F-3.3).
 */
// Each open takes a number; one that a newer open overtook while it loaded writes nothing.
let latestOpen = 0;

const handler: Operation.WithHandler<typeof LayoutOperation.Open> = LayoutOperation.Open.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ subject }) {
      const open = ++latestOpen;
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
      const drawingId =
        named ?? getLastDrawing(spaceId) ?? (yield* firstDiagram(spaceId).pipe(withFirstDiagramLock(spaceId)));
      if (open !== latestOpen) {
        return subject;
      }
      const route: Route = { spaceId, drawingId };
      recordRoute(route, 'push');
      yield* updateState(() => ({ route }));
      return subject;
    }),
  ),
);

export default handler;
