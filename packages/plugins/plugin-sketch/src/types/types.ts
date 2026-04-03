//
// Copyright 2023 DXOS.org
//

import { type TLStore } from '@tldraw/tlschema';

export interface SketchModel {
  store: TLStore;
}

export { SketchGridSchema, type SketchGridType, SketchSettingsSchema, type SketchSettingsProps } from './Settings';
