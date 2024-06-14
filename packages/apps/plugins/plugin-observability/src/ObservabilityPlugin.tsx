//
// Copyright 2023 DXOS.org
//

import { type IconProps, Info } from '@phosphor-icons/react';
import { effect } from '@preact/signals-core';
import React from 'react';

import { parseClientPlugin } from '@braneframe/plugin-client';
import {
  type Plugin,
  type PluginDefinition,
  type IntentResolverProvides,
  type SettingsProvides,
  type SurfaceProvides,
  type TranslationsProvides,
  resolvePlugin,
  parseIntentPlugin,
  parseNavigationPlugin,
  LayoutAction,
  SettingsAction,
  parsePluginHost,
} from '@dxos/app-framework';
import { EventSubscriptions } from '@dxos/async';
import { create } from '@dxos/echo-schema';
import { LocalStorageStore } from '@dxos/local-storage';
import {
  type Observability,
  getTelemetryIdentifier,
  setupTelemetryListeners,
  isObservabilityDisabled,
  storeObservabilityDisabled,
  getObservabilityGroup,
} from '@dxos/observability';
import type { EventOptions } from '@dxos/observability/segment';
import { getSize, mx } from '@dxos/react-ui-theme';

import { ObservabilitySettings, type ObservabilitySettingsProps } from './components';
import meta, { OBSERVABILITY_PLUGIN, ObservabilityAction, type UserFeedback } from './meta';
import translations from './translations';

export type ObservabilityPluginState = {
  group?: string;
  notified?: boolean;
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
    ready: async (plugins) => {
      const pluginHost = resolvePlugin(plugins, parsePluginHost);
      const navigationPlugin = resolvePlugin(plugins, parseNavigationPlugin);
      const clientPlugin = resolvePlugin(plugins, parseClientPlugin);
      const intentPlugin = resolvePlugin(plugins, parseIntentPlugin);

      const dispatch = intentPlugin?.provides?.intent?.dispatch;
      if (!dispatch) {
        return;
      }

      if (!state.values.notified) {
        await dispatch({
          action: LayoutAction.SET_LAYOUT,
          data: {
            element: 'toast',
            subject: {
              id: `${OBSERVABILITY_PLUGIN}/notice`,
              // TODO(wittjosiah): Non-react translation utils.
              title: translations[0]['en-US'][OBSERVABILITY_PLUGIN]['observability toast label'],
              description: translations[0]['en-US'][OBSERVABILITY_PLUGIN]['observability toast description'],
              duration: Infinity,
              icon: (props: IconProps) => (
                <Info className={mx(getSize(5), props.className)} weight='duotone' {...props} />
              ),
              actionLabel: translations[0]['en-US'][OBSERVABILITY_PLUGIN]['observability toast action label'],
              actionAlt: translations[0]['en-US'][OBSERVABILITY_PLUGIN]['observability toast action alt'],
              closeLabel: translations[0]['en-US'][OBSERVABILITY_PLUGIN]['observability toast close label'],
              onAction: () => dispatch({ action: SettingsAction.OPEN, data: { plugin: OBSERVABILITY_PLUGIN } }),
            },
          },
        });

        state.values.notified = true;
      }

      // Initialize asynchronously in the background, not in plugin initialization.
      // Should not block application startup.
      void options.observability().then(async (obs) => {
        observability = obs;

        // Ensure errors are tagged with enabled plugins to help with reproductions.
        pluginHost?.provides?.plugins?.enabled?.map((plugin) =>
          observability?.setTag(`pluginEnabled-${plugin}`, 'true', 'errors'),
        );

        // Start client observability (i.e. not running as shared worker)
        // TODO(nf): how to prevent multiple instances for single shared worker?
        const client = clientPlugin?.provides?.client;
        if (!client) {
          return;
        }

        subscriptions.add(
          effect(() => {
            // Read active to subscribe to changes.
            const _ = navigationPlugin?.provides?.location?.active;

            observability?.page({
              identityId: getTelemetryIdentifier(client),
            });
          }),
        );

        await dispatch({
          action: ObservabilityAction.SEND_EVENT,
          data: {
            name: 'page.load',
            properties: {
              href: window.location.href,
              // TODO(wittjosiah): These apis are deprecated. Is there a better way to find this information?
              loadDuration: window.performance.timing.loadEventEnd - window.performance.timing.loadEventStart,
            },
          },
        });

        setupTelemetryListeners(options.namespace, client, observability);

        await Promise.all([
          observability.setIdentityTags(client),
          observability.startRuntimeMetrics(client),
          observability.startNetworkMetrics(client),
          observability.startSpacesMetrics(client, options.namespace),
        ]);

        if (clientPlugin.provides.firstRun) {
          await dispatch({
            action: ObservabilityAction.SEND_EVENT,
            data: {
              name: 'identity.created',
            },
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
        resolver: async (intent, plugins) => {
          const client = resolvePlugin(plugins, parseClientPlugin)?.provides?.client;
          if (!client || !observability) {
            return;
          }

          switch (intent.action) {
            case ObservabilityAction.TOGGLE:
              settings.enabled = !settings.enabled;
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

            case ObservabilityAction.SEND_EVENT: {
              const data = intent.data as EventOptions;
              const event = {
                identityId: getTelemetryIdentifier(client),
                name: `${options.namespace}.${data.name}`,
                properties: {
                  ...data.properties,
                },
              };
              observability.event(event);
              return { data: event };
            }

            case ObservabilityAction.CAPTURE_USER_FEEDBACK: {
              const feedback = intent.data as UserFeedback;

              observability.captureUserFeedback(feedback.email, feedback.name, feedback.message);
              return { data: true };
            }
          }
        },
      },
      observability: state.values,
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
