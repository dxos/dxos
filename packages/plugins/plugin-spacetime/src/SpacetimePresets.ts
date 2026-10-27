//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { type Obj } from '@dxos/echo';

import { Model } from '#types';

import { parseOBJ, presetObjData } from './engine/index.ts';

/**
 * A model object built from a bundled preset (a fire truck, a race car, a taxi): its OBJ geometry parsed into a stored
 * mesh. Its own entry so a caller seeding a scene (a space template) can build presets without the editor, and so the
 * types modules never carry the OBJ data.
 *
 * @returns The object, or `undefined` if the preset's OBJ data does not parse.
 */
export const make = (
  preset: Model.PresetType,
  props: Omit<Partial<Obj.MakeProps<typeof Model.Object>>, 'primitive' | 'mesh'> = {},
): Model.Object | undefined => {
  const parsed = parseOBJ(presetObjData[preset]);
  if (!parsed) {
    return undefined;
  }

  return Model.make({
    label: preset,
    ...props,
    primitive: undefined,
    mesh: {
      vertexData: Model.encodeTypedArray(parsed.positions),
      indexData: Model.encodeTypedArray(parsed.indices),
    },
  });
};
