//
// Copyright 2023 DXOS.org
//

import type {
  IntentResolverProvides,
  MetadataRecordsProvides,
  SettingsProvides,
  SurfaceProvides,
  TranslationsProvides,
} from '@dxos/app-framework';
import { S } from '@dxos/echo-schema';
import { ScriptType } from '@dxos/functions';
import { type SchemaProvides } from '@dxos/plugin-space';

import { SCRIPT_PLUGIN } from './meta';

export namespace ScriptAction {
  const SCRIPT_ACTION = `${SCRIPT_PLUGIN}/action`;

  export class Create extends S.TaggedClass<Create>()(`${SCRIPT_ACTION}/create`, {
    input: S.Struct({
      name: S.optional(S.String),
    }),
    output: S.Struct({
      object: ScriptType,
    }),
  }) {}
}

export type ScriptSettingsProps = {};

export type ScriptPluginProvides = IntentResolverProvides &
  MetadataRecordsProvides &
  SchemaProvides &
  SettingsProvides<ScriptSettingsProps> &
  SurfaceProvides &
  TranslationsProvides;
