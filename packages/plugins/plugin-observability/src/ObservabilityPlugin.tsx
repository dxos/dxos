//
// Copyright 2023 DXOS.org
//

import React from 'react';

import {
  type Plugin,
  type PluginDefinition,
  type IntentResolverProvides,
  type SettingsProvides,
  type SurfaceProvides,
  type TranslationsProvides,
  resolvePlugin,
  parseIntentPlugin,
  LayoutAction,
  SettingsAction,
  createSurface,
  findPlugin,
  createIntent,
  createResolver,
} from '@dxos/app-framework';
import { EventSubscriptions } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { create } from '@dxos/live-object';
import { LocalStorageStore } from '@dxos/local-storage';
import {
  type Observability,
  getTelemetryIdentifier,
  setupTelemetryListeners,
  isObservabilityDisabled,
  storeObservabilityDisabled,
  getObservabilityGroup,
} from '@dxos/observability';
import { type Client } from '@dxos/react-client';

import { ObservabilitySettings, type ObservabilitySettingsProps } from './components';
import meta, { OBSERVABILITY_PLUGIN } from './meta';
import translations from './translations';
import { ObservabilityAction } from './types';

export type ObservabilityPluginState = {
  group?: string;
  notified?: boolean;
};

export type ObservabilityPluginProvides = IntentResolverProvides &
  SurfaceProvides &
  SettingsProvides<ObservabilitySettingsProps> &
  TranslationsProvides & {
    observability: ObservabilityPluginState;
  };

export const parseObservabilityPlugin = (plugin?: Plugin) =>
  (plugin?.provides as any).observability ? (plugin as Plugin<ObservabilityPluginProvides>) : undefined;

export const ObservabilityPlugin = (options: {
  namespace: string;
  observability: () => Promise<Observability>;
}): PluginDefinition<ObservabilityPluginProvides> => {
  const settings = create<ObservabilitySettingsProps>({});
  const state = new LocalStorageStore<ObservabilityPluginState>(OBSERVABILITY_PLUGIN);
  const subscriptions = new EventSubscriptions();
  let observability: Observability | undefined;

  return {
    meta,
    initialize: async () => {
      settings.enabled = !(await isObservabilityDisabled(options.namespace));
      state.values.group = await getObservabilityGroup(options.namespace);
      state.prop({ key: 'notified', type: LocalStorageStore.bool({ allowUndefined: true }) });
    },
    ready: async ({ plugins }) => {
      const client = findPlugin<{ client: Client }>(plugins, 'dxos.org/plugin/client')?.provides.client;
      const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);

      const dispatch = intentPlugin?.provides?.intent?.dispatchPromise;
      if (!dispatch) {
        return;
      }

      const sendPrivacyNotice = async () => {
        const environment = client?.config?.values.runtime?.app?.env?.DX_ENVIRONMENT;
        const notify =
          environment && environment !== 'ci' && !environment.endsWith('.local') && !environment.endsWith('.lan');
        if (!state.values.notified && notify) {
          await dispatch(
            createIntent(LayoutAction.SetLayout, {
              element: 'toast',
              subject: {
                id: `${OBSERVABILITY_PLUGIN}/notice`,
                // TODO(wittjosiah): Non-react translation utils.
                title: translations[0]['en-US'][OBSERVABILITY_PLUGIN]['observability toast label'],
                description: translations[0]['en-US'][OBSERVABILITY_PLUGIN]['observability toast description'],
                duration: Infinity,
                icon: 'ph--info--regular',
                actionLabel: translations[0]['en-US'][OBSERVABILITY_PLUGIN]['observability toast action label'],
                actionAlt: translations[0]['en-US'][OBSERVABILITY_PLUGIN]['observability toast action alt'],
                closeLabel: translations[0]['en-US'][OBSERVABILITY_PLUGIN]['observability toast close label'],
                onAction: () => dispatch(createIntent(SettingsAction.Open, { plugin: OBSERVABILITY_PLUGIN })),
              },
            }),
          );

          state.values.notified = true;
        }
      };

      // Initialize asynchronously in the background, not in plugin initialization.
      // Should not block application startup.
      void options.observability().then(async (obs) => {
        observability = obs;

        // Ensure errors are tagged with enabled plugins to help with reproductions.
        plugins.map((plugin) => observability?.setTag(`pluginEnabled-${plugin.meta.id}`, 'true', 'errors'));

        // Start client observability (i.e. not running as shared worker)
        // TODO(nf): how to prevent multiple instances for single shared worker?
        if (!client) {
          return;
        }

        await dispatch(
          createIntent(ObservabilityAction.SendEvent, {
            name: 'page.load',
            properties: {
              href: window.location.href,
              // TODO(wittjosiah): These apis are deprecated. Is there a better way to find this information?
              loadDuration: window.performance.timing.loadEventEnd - window.performance.timing.loadEventStart,
            },
          }),
        );

        setupTelemetryListeners(options.namespace, client, observability);

        await Promise.all([
          observability.setIdentityTags(client.services.services),
          observability.startRuntimeMetrics(client),
          observability.startNetworkMetrics(client.services.services),
          observability.startSpacesMetrics(client, options.namespace),
        ]);

        if (client.halo.identity.get()) {
          await sendPrivacyNotice();
        } else {
          const subscription = client.halo.identity.subscribe(async (identity) => {
            if (identity && observability) {
              await sendPrivacyNotice();
              await observability.setIdentityTags(client.services.services);
              subscription.unsubscribe();
            }
          });
        }
      });
    },
    unload: async () => {
      subscriptions.clear();
      await observability?.close();
    },
    provides: {
      intent: {
        resolvers: ({ plugins }) => {
          const client = findPlugin<{ client: Client }>(plugins, 'dxos.org/plugin/client')?.provides.client;
          if (!client || !observability) {
            return [];
          }

          return [
            createResolver(ObservabilityAction.Toggle, async ({ state }) => {
              invariant(observability, 'Observability instance not available');
              settings.enabled = state ?? !settings.enabled;
              observability.event({
                identityId: getTelemetryIdentifier(client),
                name: `${options.namespace}.observability.toggle`,
                properties: {
                  enabled: settings.enabled,
                },
              });
              observability.setMode(settings.enabled ? 'basic' : 'disabled');
              await storeObservabilityDisabled(options.namespace, !settings.enabled);
              return { data: settings.enabled };
            }),
            createResolver(ObservabilityAction.SendEvent, async (data) => {
              invariant(observability, 'Observability instance not available');
              const event = {
                identityId: getTelemetryIdentifier(client),
                name: `${options.namespace}.${data.name}`,
                properties: {
                  ...data.properties,
                },
              };
              observability.event(event);
            }),
            createResolver(ObservabilityAction.CaptureUserFeedback, async (data) => {
              invariant(observability, 'Observability instance not available');
              observability.captureUserFeedback(data.email, data.name, data.message);
            }),
          ];
        },
      },
      observability: state.values,
      settings,
      surface: {
        definitions: () =>
          createSurface({
            id: OBSERVABILITY_PLUGIN,
            role: 'settings',
            filter: (data): data is any => data.subject === OBSERVABILITY_PLUGIN,
            component: () => <ObservabilitySettings settings={settings} />,
          }),
      },
      translations,
    },
  };
};
