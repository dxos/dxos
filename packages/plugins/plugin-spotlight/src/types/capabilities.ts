//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';

import { meta } from '../meta';

export type SpotlightState = {
  /** Dialog surface data (commands dialog is the default). */
  dialogContent?: { component: string; props?: Record<string, any> };
  /** Whether the dialog is currently showing. */
  dialogOpen: boolean;
};

export const SpotlightState = Capability.make<Atom.Writable<SpotlightState>>(`${meta.id}.state`);
