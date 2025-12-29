//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { LocalStorageStore } from '@dxos/local-storage';
import { getObservabilityGroup } from '@dxos/observability';

import { meta } from '../../meta';
import { ObservabilityCapabilities } from '../../types';

export default Capability.makeModule(async ({ namespace }: { namespace: string }) => {
  const state = new LocalStorageStore<ObservabilityCapabilities.State>(meta.id);

  state.prop({ key: 'notified', type: LocalStorageStore.bool({ allowUndefined: true }) });

  // NOTE: This is not stored in local storage such that it can be accessed by workers.
  state.values.group = await getObservabilityGroup(namespace);

  return Capability.contributes(ObservabilityCapabilities.State, state.values, () => state.close());
});
