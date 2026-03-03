//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';

import { meta } from '../meta';

import { type SketchSettingsProps } from './types';

export namespace SketchCapabilities {
  export const Settings = Capability.make<Atom.Writable<SketchSettingsProps>>(`${meta.id}/capability/settings`);
}
