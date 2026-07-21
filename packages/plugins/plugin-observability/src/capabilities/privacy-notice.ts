//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { LayoutOperation, SettingsOperation } from '@dxos/app-toolkit';

import { meta } from '#meta';
import { ObservabilityCapabilities } from '#types';

/**
 * Shows the privacy notice toast once when an identity is first created.
 * Activates on `ClientEvents.IdentityCreated` — which only fires for genuinely
 * new identities, not for recovered or joined ones — so no HALO device-count
 * checks or session-storage flags are needed.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const { invokePromise } = yield* Capabilities.OperationInvoker;
    const registry = yield* Capabilities.AtomRegistry;
    const stateAtom = yield* ObservabilityCapabilities.State;
    const client = yield* ObservabilityCapabilities.ClientCapability;

    const environment = client?.config?.values.runtime?.app?.env?.DX_ENVIRONMENT;
    const notify =
      environment && environment !== 'ci' && !environment.endsWith('.local') && !environment.endsWith('.lan');

    const state = registry.get(stateAtom);
    if (!state.notified && notify) {
      yield* Effect.tryPromise(() =>
        invokePromise(LayoutOperation.AddToast, {
          id: `${meta.profile.key}.notice`,
          title: ['observability-toast.label', { ns: meta.profile.key }],
          description: ['observability-toast.description', { ns: meta.profile.key }],
          duration: Infinity,
          icon: 'ph--info--regular',
          actionLabel: ['observability-toast-action.label', { ns: meta.profile.key }],
          actionAlt: ['observability-toast-action.alt', { ns: meta.profile.key }],
          closeLabel: ['observability-toast-close.label', { ns: meta.profile.key }],
          onAction: () => invokePromise(SettingsOperation.Open, { plugin: meta.profile.key }),
        }),
      );
      registry.set(stateAtom, { ...registry.get(stateAtom), notified: true });
    }

    return [];
  }),
);
