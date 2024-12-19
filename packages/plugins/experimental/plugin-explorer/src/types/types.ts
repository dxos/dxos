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

import { ViewType } from './schema';
import { EXPLORER_PLUGIN } from '../meta';

export namespace ExplorerAction {
  const EXPLORER_ACTION = `${EXPLORER_PLUGIN}/action`;

  export class Create extends S.TaggedClass<Create>()(`${EXPLORER_ACTION}/create`, {
    input: S.Struct({
      name: S.optional(S.String),
    }),
    output: S.Struct({
      object: ViewType,
    }),
  }) {}
}

export type ExplorerPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  MetadataRecordsProvides &
  TranslationsProvides &
  SchemaProvides;
