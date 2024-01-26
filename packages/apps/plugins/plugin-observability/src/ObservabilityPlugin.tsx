//
// Copyright 2023 DXOS.org
//

import { effect } from '@preact/signals-react';
import { deepSignal } from 'deepsignal/react';
import React from 'react';

import { parseClientPlugin } from '@braneframe/plugin-client';
import {
  type Plugin,
  type PluginDefinition,
  type IntentResolverProvides,
  type SettingsProvides,
  type SurfaceProvides,
  type TranslationsProvides,
  parseLayoutPlugin,
  resolvePlugin,
} from '@dxos/app-framework';
import { EventSubscriptions } from '@dxos/async';
import {
  type Observability,
  BASE_TELEMETRY_PROPERTIES,
  getTelemetryIdentifier,
  setupTelemetryListeners,
  isObservabilityDisabled,
  storeObservabilityDisabled,
  getObservabilityGroup,
} from '@dxos/observability';
import type { EventOptions } from '@dxos/observability/segment';

import { ObservabilitySettings, type ObservabilitySettingsProps } from './components';
import meta, { ObservabilityAction } from './meta';
import translations from './translations';

export type ObservabilityPluginState = {
  group?: string;
};

export type ObservabilityPluginProvides = IntentResolverProvides &
  SurfaceProvides &
  SettingsProvides &
  TranslationsProvides & {
    observability: ObservabilityPluginState;
  };

export const parseObservabilityPlugin = (plugin?: Plugin) =>
  (plugin?.provides as any).observability ? (plugin as Plugin<ObservabilityPluginProvides>) : undefined;

export const ObservabilityPlugin = (options: {
  namespace: string;
  observability: () => Promise<Observability>;
}): PluginDefinition<ObservabilityPluginProvides> => {
  const settings = deepSignal<ObservabilitySettingsProps>({});
  const state = deepSignal<ObservabilityPluginState>({});
  const subscriptions = new EventSubscriptions();
  let observability: Observability | undefined;

  return {
    meta,
    initialize: async () => {
      settings.enabled = !(await isObservabilityDisabled(options.namespace));
      state.group = await getObservabilityGroup(options.namespace);
    },
    ready: async (plugins) => {
      const layoutPlugin = resolvePlugin(plugins, parseLayoutPlugin);
      const clientPlugin = resolvePlugin(plugins, parseClientPlugin);

      // Initialize asynchronously in the background, not in plugin initialization.
      // Should not block application startup.
      void options.observability().then(async (obs) => {
        observability = obs;

        // Start client observability (i.e. not running as shared worker)
        // TODO(nf): how to prevent multiple instances for single shared worker?
        const client = clientPlugin?.provides?.client;
        if (!client) {
          return;
        }

        subscriptions.add(
          effect(async () => {
            observability?.event({
              identityId: getTelemetryIdentifier(client),
              name: `${options.namespace}.observability.toggle`,
              properties: {
                ...BASE_TELEMETRY_PROPERTIES,
                enabled: settings.enabled,
              },
            });

            observability?.setMode(settings.enabled ? 'full' : 'disabled');
            await storeObservabilityDisabled(options.namespace, !settings.enabled);
          }),
        );

        subscriptions.add(
          effect(() => {
            // Read active to subscribe to changes.
            const _ = layoutPlugin?.provides?.layout?.active;

            observability?.page({
              identityId: getTelemetryIdentifier(client),
              properties: BASE_TELEMETRY_PROPERTIES,
            });
          }),
        );

        observability.event({
          identityId: getTelemetryIdentifier(client),
          name: `${options.namespace}.page.load`,
          properties: {
            ...BASE_TELEMETRY_PROPERTIES,
            href: window.location.href,
            loadDuration: window.performance.timing.loadEventEnd - window.performance.timing.loadEventStart,
          },
        });

        setupTelemetryListeners(options.namespace, client, observability);

        await observability.setIdentityTags(client);
        await observability.startNetworkMetrics(client);
        await observability.startSpacesMetrics(client);
        await observability.startRuntimeMetrics(client);
      });
    },
    unload: async () => {
      subscriptions.clear();
      await observability?.close();
    },
    provides: {
      intent: {
        resolver: (intent) => {
          switch (intent.action) {
            case ObservabilityAction.TOGGLE:
              settings.enabled = !settings.enabled;
              return { data: settings.enabled };

            case ObservabilityAction.SEND_EVENT:
              observability?.event(intent.data as EventOptions);
              return { data: true };
          }
        },
      },
      observability: state,
      settings,
      surface: {
        component: ({ role, data }) => {
          switch (role) {
            case 'settings':
              return data.plugin === meta.id ? <ObservabilitySettings settings={settings} /> : null;
          }

          return null;
        },
      },
      translations,
    },
  };
};
