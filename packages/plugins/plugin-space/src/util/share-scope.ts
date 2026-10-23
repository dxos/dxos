//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Database, EID, Obj } from '@dxos/echo';
import { EntityId, type SpaceId } from '@dxos/keys';

/** Most objects one share link carries, so a densely linked graph cannot pull in a whole space. */
export const MAX_SCOPE_OBJECTS = 64;

/** How long one referenced object may take to load before the walk leaves it out. */
const LOAD_TIMEOUT = 5_000;

/**
 * An ECHO URI as references and markdown links spell it: `echo://<space>/<id>`, `echo:///<id>`, or the older
 * `dxn:echo:<space | @>:<id>`. Group 1 or 2 is the space (empty or `@` for the local space), group 3 the object.
 */
const ECHO_URI_PATTERN = /(?:echo:\/\/([0-9A-Z]*)\/|dxn:echo:([0-9A-Z]+|@):)([0-9A-HJKMNP-TV-Z]{26})/g;

/**
 * Ids of the objects in `spaceId` that a JSON value refers to: `{ '/': uri }` references anywhere in it, and ECHO URIs
 * inside its strings (a markdown link to another document). `@`-prefixed keys are skipped — the object's own URI, its
 * parent, its metadata — so a walk follows what an object holds rather than what holds it.
 */
export const findReferencedObjectIds = (value: unknown, spaceId: SpaceId): EntityId[] => {
  const ids = new Set<EntityId>();
  const visit = (node: unknown): void => {
    if (typeof node === 'string') {
      for (const [, uriSpace, dxnSpace, id] of node.matchAll(ECHO_URI_PATTERN)) {
        const space = uriSpace ?? dxnSpace;
        if ((!space || space === '@' || space === spaceId) && EntityId.isValid(id)) {
          ids.add(id);
        }
      }
    } else if (Array.isArray(node)) {
      node.forEach(visit);
    } else if (node !== null && typeof node === 'object') {
      for (const [key, child] of Object.entries(node)) {
        if (!key.startsWith('@')) {
          visit(child);
        }
      }
    }
  };
  visit(value);
  return [...ids];
};

/**
 * The objects a share link for `object` carries: the object first, then everything reachable from it through
 * {@link findReferencedObjectIds}, breadth-first and inside its space, up to `maxObjects`. A reference that does not
 * load in time is left out rather than stalling the link.
 */
export const collectShareScope = (
  object: Obj.Unknown,
  { maxObjects = MAX_SCOPE_OBJECTS }: { maxObjects?: number } = {},
): Effect.Effect<Obj.Unknown[]> =>
  Effect.gen(function* () {
    const db = Obj.getDatabase(object);
    const scope = new Map<string, Obj.Unknown>([[object.id, object]]);
    if (!db) {
      return [...scope.values()];
    }

    const queue: Obj.Unknown[] = [object];
    for (let current = queue.shift(); current && scope.size < maxObjects; current = queue.shift()) {
      for (const id of findReferencedObjectIds(Obj.toJSON(current), db.spaceId)) {
        if (scope.has(id) || scope.size >= maxObjects) {
          continue;
        }
        const target = yield* Database.load(db.makeRef(EID.make({ spaceId: db.spaceId, entityId: id }))).pipe(
          Effect.timeout(LOAD_TIMEOUT),
          Effect.option,
        );
        if (Option.isSome(target) && Obj.isObject(target.value)) {
          scope.set(id, target.value);
          queue.push(target.value);
        }
      }
    }

    return [...scope.values()];
  });
