//
// Copyright 2025 DXOS.org
//

import { contributes } from '@dxos/app-framework';
import { LocalStorageStore } from '@dxos/local-storage';
import { getObservabilityGroup } from '@dxos/observability';

import { OBSERVABILITY_PLUGIN } from '../meta';

import { ObservabilityCapabilities } from './capabilities';

export default async ({ namespace }: { namespace: string }) => {
  const state = new LocalStorageStore<ObservabilityCapabilities.State>(OBSERVABILITY_PLUGIN);

  state.prop({ key: 'notified', type: LocalStorageStore.bool({ allowUndefined: true }) });

  // NOTE: This is not stored in local storage such that it can be accessed by workers.
  state.values.group = await getObservabilityGroup(namespace);

  return contributes(ObservabilityCapabilities.State, state.values, () => state.close());
};
