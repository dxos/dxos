//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { LocalStorageStore } from '@dxos/local-storage';
import { getObservabilityGroup } from '@dxos/observability';

import { meta } from '../../meta';
import { ObservabilityCapabilities } from '../../types';

export default Capability.makeModule(({ namespace }: { namespace: string }) =>
  Effect.gen(function* () {
    const state = new LocalStorageStore<ObservabilityCapabilities.State>(meta.id);

    state.prop({ key: 'notified', type: LocalStorageStore.bool({ allowUndefined: true }) });

    // NOTE: This is not stored in local storage such that it can be accessed by workers.
    state.values.group = yield* Effect.tryPromise(() => getObservabilityGroup(namespace));

    return Capability.contributes(ObservabilityCapabilities.State, state.values, () =>
      Effect.sync(() => state.close()),
    );
  }),
);
