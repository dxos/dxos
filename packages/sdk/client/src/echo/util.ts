// TODO(burdon): Factor out to spaces.
//
// Copyright 2023 DXOS.org
//

import { type Space } from '@dxos/client-protocol';
import { getDatabaseFromObject } from '@dxos/echo-db';
import { type ReactiveObject } from '@dxos/echo-schema';

import { SpaceProxy } from './space-proxy';

export const getSpace = (object: ReactiveObject<any>): Space | undefined => {
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

export const isSpace = (object: unknown): object is Space => object instanceof SpaceProxy;

/**
 * Fully qualified id of a reactive object is a combination of the space key and the object id.
 *
 * @returns Fully qualified id of a reactive object.
 */
export const fullyQualifiedId = (object: ReactiveObject<any>): string => {
  const space = getSpace(object);
  return space ? `${space.key.toHex()}:${object.id}` : object.id;
};
