//
// Copyright 2023 DXOS.org
//

import type {
  IntentResolverProvides,
  TranslationsProvides,
  SurfaceProvides,
  MetadataRecordsProvides,
} from '@dxos/app-framework';
import { S } from '@dxos/echo-schema';
import type { SchemaProvides } from '@dxos/plugin-space';

import { TreeType } from './tree';
import { OUTLINER_PLUGIN } from '../meta';

export namespace OutlinerAction {
  const OUTLINER_ACTION = `${OUTLINER_PLUGIN}/action`;

  export class Create extends S.TaggedClass<Create>()(`${OUTLINER_ACTION}/create`, {
    input: S.Struct({
      name: S.optional(S.String),
    }),
    output: S.Struct({
      object: TreeType,
    }),
  }) {}

  export class ToggleCheckbox extends S.TaggedClass<ToggleCheckbox>()(`${OUTLINER_ACTION}/toggle-checkbox`, {
    input: S.Struct({
      object: TreeType,
    }),
    output: S.Void,
  }) {}
}

export type OutlinerPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  MetadataRecordsProvides &
  TranslationsProvides &
  SchemaProvides;
