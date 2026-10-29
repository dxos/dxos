//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as SettingsOperation from '@dxos/app-toolkit/SettingsOperation';
import { getEnvString } from '@dxos/config';

import { ObservabilityCapabilities } from '#types';

import { ObservabilityNamespace } from '../namespace.ts';

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

    const environment = getEnvString(client?.config, 'DX_ENVIRONMENT');
    const notify =
      environment && environment !== 'ci' && !environment.endsWith('.local') && !environment.endsWith('.lan');

    const state = registry.get(stateAtom);
    if (!state.notified && notify) {
      yield* Effect.tryPromise(() =>
        invokePromise(LayoutOperation.AddToast, {
          id: `${ObservabilityNamespace.key}.notice`,
          title: ['observability-toast.label', { ns: ObservabilityNamespace.key }],
          description: ['observability-toast.description', { ns: ObservabilityNamespace.key }],
          duration: Infinity,
          icon: 'ph--info--regular',
          actionLabel: ['observability-toast-action.label', { ns: ObservabilityNamespace.key }],
          actionAlt: ['observability-toast-action.alt', { ns: ObservabilityNamespace.key }],
          closeLabel: ['observability-toast-close.label', { ns: ObservabilityNamespace.key }],
          onAction: () => invokePromise(SettingsOperation.Open, { plugin: ObservabilityNamespace.key }),
        }),
      );
      registry.set(stateAtom, { ...registry.get(stateAtom), notified: true });
    }

    return [];
  }),
);
