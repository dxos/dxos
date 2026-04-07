//
// Copyright 2023 DXOS.org
//

import { type Space, SpaceState } from '@dxos/client/echo';
import { type Database, Obj, Type } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Expando } from '@dxos/schema';
import { type Label } from '@dxos/ui-types';

import { meta } from '#meta';

//
// Constants
//

const PERSONAL_SPACE_LABEL: Label = ['personal-space.label', { ns: meta.id }];
const UNNAMED_SPACE_LABEL: Label = ['unnamed-space.label', { ns: meta.id }];

export const SPACES = `${meta.id}-spaces`;
export { SHARED } from './types';

//
// Helpers
//

/** Returns the display label for a space (name, namesCache entry, or fallback). */
export const getSpaceDisplayName = (
  space: Space,
  { personal, namesCache = {} }: { personal?: boolean; namesCache?: Record<string, string> } = {},
): Label => {
  return space.state.get() === SpaceState.SPACE_READY && (space.properties.name?.length ?? 0) > 0
    ? space.properties.name!
    : namesCache[space.id]
      ? namesCache[space.id]
      : personal
        ? PERSONAL_SPACE_LABEL
        : UNNAMED_SPACE_LABEL;
};

//
// Deprecated
//

/** @deprecated This is a temporary solution. */
export const getNestedObjects = async (
  object: Obj.Unknown,
  resolve: (typename: string) => Record<string, any>,
): Promise<Obj.Unknown[]> => {
  const type = Obj.getTypename(object);
  if (!type) {
    return [];
  }

  const metadata = resolve(type);
  const loadReferences = metadata?.loadReferences;
  if (typeof loadReferences !== 'function') {
    return [];
  }

  const objects: Obj.Unknown[] = await loadReferences(object);
  const nested = await Promise.all(objects.map((object) => getNestedObjects(object, resolve)));
  return [...objects, ...nested.flat()];
};

/** @deprecated Workaround for ECHO not supporting clone. */
export const cloneObject = async (
  object: Obj.Unknown,
  resolve: (typename: string) => Record<string, any>,
  newDb: Database.Database,
): Promise<Obj.Unknown> => {
  const schema = Obj.getSchema(object);
  const typename = schema ? (Type.getTypename(schema) ?? Expando.Expando.typename) : Expando.Expando.typename;
  const metadata = resolve(typename);
  const serializer = metadata.serializer;
  invariant(serializer, `No serializer for type: ${typename}`);
  const content = await serializer.serialize({ object });
  return serializer.deserialize({ content, db: newDb, newId: true });
};
