//
// Copyright 2023 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';

import { meta } from '../meta';
import { type SketchSettingsProps } from './Settings';

export const EXCALIDRAW_SCHEMA = 'excalidraw.com/2';

export interface SketchModel {}

export namespace ExcalidrawCapabilities {
  export const Settings = Capability.make<Atom.Writable<SketchSettingsProps>>(`${meta.id}.capability.settings`);
}

export * from './Settings';
