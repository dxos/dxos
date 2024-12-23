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

import { CanvasBoardType } from './schema';
import { CANVAS_PLUGIN } from '../meta';

export namespace CanvasAction {
  const CANVAS_ACTION = `${CANVAS_PLUGIN}/action`;

  export class Create extends S.TaggedClass<Create>()(`${CANVAS_ACTION}/create`, {
    input: S.Struct({
      name: S.optional(S.String),
    }),
    output: S.Struct({
      object: CanvasBoardType,
    }),
  }) {}
}

export type CanvasPluginProvides = SurfaceProvides &
  IntentResolverProvides &
  MetadataRecordsProvides &
  TranslationsProvides &
  SchemaProvides;
