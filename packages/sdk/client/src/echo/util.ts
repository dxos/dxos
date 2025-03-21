// TODO(burdon): Factor out to spaces.
//
// Copyright 2023 DXOS.org
//

import { type Space } from '@dxos/client-protocol';
import { getDatabaseFromObject, isEchoObject, type ReactiveEchoObject } from '@dxos/echo-db';
import { type ObjectId, S } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { type SpaceId } from '@dxos/keys';
import { isReactiveObject, type ReactiveObject } from '@dxos/live-object';

import { SpaceProxy } from './space-proxy';

export const SPACE_ID_LENGTH = 33;
export const OBJECT_ID_LENGTH = 26;
export const FQ_ID_LENGTH = SPACE_ID_LENGTH + OBJECT_ID_LENGTH + 1;

export const isSpace = (object: unknown): object is Space => object instanceof SpaceProxy;

export const SpaceSchema: S.Schema<Space> = S.Any.pipe(
  S.filter((x) => isSpace(x)),
  S.annotations({ title: 'Space' }),
);

// TODO(dmaretskyi): Move to @dxos/echo-schema.
export const ReactiveObjectSchema: S.Schema<ReactiveObject<any>> = S.Any.pipe(
  S.filter((x) => isReactiveObject(x)),
  S.annotations({ title: 'ReactiveObject' }),
);
export const EchoObjectSchema: S.Schema<ReactiveEchoObject<any>> = S.Any.pipe(
  S.filter((x) => isEchoObject(x)),
  S.annotations({ title: 'EchoObject' }),
);

export const getSpace = (object?: ReactiveObject<any>): Space | undefined => {
  if (!object) {
    return undefined;
  }

  const db = getDatabaseFromObject(object);
  const id = db?.spaceId;
  if (id) {
    const owner = db.graph._getOwningObject(id);
    if (owner instanceof SpaceProxy) {
      return owner;
    }
  }

  return undefined;
};

/**
 * Fully qualified id of a reactive object is a combination of the space id and the object id.
 * @returns Fully qualified id of a reactive object.
 * @deprecated Prefer DXNs.
 */
export const fullyQualifiedId = (object: ReactiveObject<any>): string => {
  const space = getSpace(object);
  return space ? `${space.id}:${object.id}` : object.id;
};

/**
 * @deprecated Use `parseId` instead.
 */
export const parseFullyQualifiedId = (id: string): [string, string] => {
  const [spaceId, objectId] = id.split(':');
  invariant(objectId, 'invalid id');
  return [spaceId, objectId];
};

export const parseId = (id?: string): { spaceId?: SpaceId; objectId?: ObjectId } => {
  if (!id) {
    return {};
  } else if (id.length === SPACE_ID_LENGTH) {
    return { spaceId: id as SpaceId };
  } else if (id.length === OBJECT_ID_LENGTH) {
    return { objectId: id as ObjectId };
  } else if (id.length === FQ_ID_LENGTH && id.indexOf(':') === SPACE_ID_LENGTH) {
    const [spaceId, objectId] = id.split(':');
    return { spaceId: spaceId as SpaceId, objectId: objectId as ObjectId };
  } else {
    return {};
  }
};
