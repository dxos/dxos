//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type Space, SpaceState } from '@dxos/client/echo';
import { Operation } from '@dxos/compute';
import { Obj, Type } from '@dxos/echo';
import { type Label } from '@dxos/ui-types/translations';

import { meta } from '#meta';
import { SpaceOperation } from '#operations';
import { type SpaceCapabilities } from '#types';

//
// Constants
//

const PERSONAL_SPACE_LABEL: Label = ['personal-space.label', { ns: meta.profile.key }];
const UNNAMED_SPACE_LABEL: Label = ['unnamed-space.label', { ns: meta.profile.key }];

export const SPACES = `${meta.profile.key}-spaces`;
export { SHARED } from './types';

//
// Helpers
//

/**
 * Creates a synthetic CreateObjectEntry for a database-persisted object schema that has no dedicated plugin capability.
 * Sets inputSchema so the create dialog presents a form for the type's fields.
 */
export const makeCreateObjectEntryForDatabaseType = (type: Type.AnyObj): SpaceCapabilities.CreateObjectEntry => ({
  id: Type.getTypename(type),
  inputSchema: Type.getSchema(type),
  createObject: (props, options) =>
    Effect.gen(function* () {
      const object = Obj.make(type, props);
      return yield* Operation.invoke(SpaceOperation.AddObject, {
        object,
        target: options.target,
      });
    }),
});

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
