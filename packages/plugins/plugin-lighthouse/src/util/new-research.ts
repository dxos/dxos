//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as NavigationOperation from '@dxos/app-toolkit/NavigationOperation';
import * as Operation from '@dxos/compute/Operation';
import { type Database, Filter, Obj, Ref } from '@dxos/echo';
import { Connection } from '@dxos/link';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';

import { Research } from '#types';

import { LIGHTHOUSE_CONNECTOR_ID } from '../constants.ts';

/** A new Research; a space with one lighthouse connection needs no picking, so it starts on that one. */
export const makeResearch = (
  db: Pick<Database.Database, 'query'>,
  props: { name?: string; run?: string } = {},
): Effect.Effect<Research.Research> =>
  Effect.promise(() =>
    db.query(Filter.type(Connection.Connection, { connectorId: LIGHTHOUSE_CONNECTOR_ID })).run(),
  ).pipe(
    Effect.map((connections) =>
      Research.make({
        name: props.name ?? 'New research',
        ...(props.run?.trim() ? { run: props.run.trim() } : {}),
        ...(connections[0] ? { connection: Ref.make(connections[0]) } : {}),
      }),
    ),
  );

/**
 * The Research section's +: a new Research, opened straight on its goal form (no dialog — the goal is what a session
 * is, and the article focuses it).
 */
export const startNewResearch = (db: Database.Database) =>
  Effect.gen(function* () {
    const research = yield* makeResearch(db);
    const { object } = yield* Operation.invoke(SpaceOperation.AddObject, { object: research }, { spaceId: db.spaceId });
    const { targets } = yield* Operation.invoke(NavigationOperation.ResolveNavigationTargets, {
      query: { uri: Obj.getURI(object) },
    });
    const target = targets[0];
    if (target) {
      yield* Operation.invoke(LayoutOperation.Open, { subject: [target.path], navigation: 'immediate' });
      yield* Operation.invoke(LayoutOperation.Expose, { subject: target.path });
    }
    return object;
  });
