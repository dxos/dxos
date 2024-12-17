//
// Copyright 2023 DXOS.org
//

import type {
  IntentResolverProvides,
  MetadataRecordsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';
import { S } from '@dxos/echo-schema';
import { type SchemaProvides } from '@dxos/plugin-space';

import { GridType } from './grid';
import { GRID_PLUGIN } from '../meta';

export namespace GridAction {
  const GRID_ACTION = `${GRID_PLUGIN}/action`;

  export class Create extends S.TaggedClass<Create>()(`${GRID_ACTION}/create`, {
    input: S.Struct({
      name: S.optional(S.String),
    }),
    output: S.Struct({
      object: GridType,
    }),
  }) {}
}

export type GridPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  MetadataRecordsProvides &
  TranslationsProvides &
  SchemaProvides;
