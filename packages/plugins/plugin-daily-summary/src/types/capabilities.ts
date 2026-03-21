//
// Copyright 2026 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';

import { meta } from '../meta';

import { type DailySummarySettingsProps } from './schema';

export namespace DailySummaryCapabilities {
  export const Settings = Capability.make<Atom.Writable<DailySummarySettingsProps>>(
    `${meta.id}.capability.settings`,
  );
}
