//
// Copyright 2023 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';
import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';

import { meta } from './meta';

export const EXCALIDRAW_SCHEMA = 'excalidraw.com/2';

export interface SketchModel {}

export const SketchGridSchema = Schema.Literal('mesh', 'dotted');
export type SketchGridType = Schema.Schema.Type<typeof SketchGridSchema>;

export const SketchSettingsSchema = Schema.mutable(
  Schema.Struct({
    autoHideControls: Schema.optional(Schema.Boolean),
    gridType: Schema.optional(SketchGridSchema),
  }),
);

export type SketchSettingsProps = Schema.Schema.Type<typeof SketchSettingsSchema>;

export namespace ExcalidrawCapabilities {
  export const Settings = Capability.make<Atom.Writable<SketchSettingsProps>>(`${meta.id}.capability.settings`);
}
