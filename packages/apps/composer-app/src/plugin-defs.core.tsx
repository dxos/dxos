//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import {
  ActivationEvent,
  ActivationEvents,
  Capabilities,
  type Plugin,
  type PluginManager,
  ProcessManagerPlugin,
} from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
import { NativePasskey } from '@dxos/app-toolkit';
import { type ClientServicesProvider, type Config } from '@dxos/client';
import { type IdbLogStore } from '@dxos/log-store-idb';
import { type Observability } from '@dxos/observability';
import { AttentionPlugin } from '@dxos/plugin-attention/plugin';
import { ClientPlugin } from '@dxos/plugin-client/plugin';
import { DeckPlugin } from '@dxos/plugin-deck/plugin';
import { GraphPlugin } from '@dxos/plugin-graph/plugin';
import { NavTreePlugin } from '@dxos/plugin-navtree/plugin';
import { ObservabilityPlugin } from '@dxos/plugin-observability/plugin';
import { OnboardingPlugin } from '@dxos/plugin-onboarding/plugin';
import { ProgressPlugin } from '@dxos/plugin-progress/plugin';
import { RegistryPlugin } from '@dxos/plugin-registry/plugin';
import { RoutinePlugin } from '@dxos/plugin-routine/plugin';
import { SettingsPlugin } from '@dxos/plugin-settings/plugin';
import { SimpleLayoutPlugin } from '@dxos/plugin-simple-layout/plugin';
import { SpacePlugin } from '@dxos/plugin-space/plugin';
import { SpaceCapabilities, SpaceEvents } from '@dxos/plugin-space/types';
import { SpotlightPlugin } from '@dxos/plugin-spotlight/plugin';
import { StatusBarPlugin } from '@dxos/plugin-status-bar/plugin';
import { ThemePlugin } from '@dxos/plugin-theme/plugin';

import { downloadLogs } from './util';

const APP_LINK_ORIGIN = new URL('https://' + NativePasskey.APP_DOMAIN).origin;

export type State = {
  appKey: string;
  config: Config;
  services: ClientServicesProvider;
  observability: Promise<Observability.Observability>;
  logStore: IdbLogStore;
};

export type PluginConfig = State & {
  isDev?: boolean;
  isLocal?: boolean;
  isPwa?: boolean;
  isTauri?: boolean;
  isLabs?: boolean;
  isStrict?: boolean;
  isPopover?: boolean;
  isMobile?: boolean;
};

/**
 * Infrastructure plugins shared by every plugin set (`plugin-defs.tsx` and
 * `plugin-defs.minimal.tsx`) — options here are the single source of truth.
 */
export const getCorePlugins = ({
  appKey,
  config,
  services,
  observability,
  logStore,
  isDev,
  isLocal,
  isTauri,
  isPopover,
  isMobile,
}: PluginConfig): Plugin.Plugin[] => {
  const layoutPlugin = isPopover ? SpotlightPlugin() : isMobile ? SimpleLayoutPlugin({}) : DeckPlugin();
  const origin = isTauri ? APP_LINK_ORIGIN : window.location.origin;
  return [
    AttentionPlugin(),
    ClientPlugin({
      config,
      services,
      shareableLinkOrigin: origin,
      onReset: ({ target }) =>
        Effect.sync(() => {
          localStorage.clear();
          if (target === 'deviceInvitation') {
            window.location.assign(new URL('/?deviceInvitationCode=', window.location.origin));
          } else if (target === 'recoverIdentity') {
            window.location.assign(new URL('/?recoverIdentity=true', window.location.origin));
          } else {
            window.location.pathname = '/';
          }
        }),
    }),
    GraphPlugin(),
    layoutPlugin,
    NavTreePlugin(),
    ObservabilityPlugin({
      namespace: appKey,
      observability: () => observability,
      downloadLogs: () => downloadLogs(logStore),
    }),
    OnboardingPlugin({ generateExemplarSpace: !isLocal }),
    ProcessManagerPlugin(),
    ProgressPlugin(),
    RegistryPlugin(),
    RoutinePlugin(),
    SettingsPlugin(),
    SpacePlugin({
      observability: true,
      shareableLinkOrigin: origin,
    }),
    StatusBarPlugin(),
    ThemePlugin({
      appName: 'Composer',
      noCache: isDev,
      platform: isMobile ? 'mobile' : 'desktop',
    }),
  ];
};

/**
 * Demand-driven activation policy (startup-latency wave 1): parks content plugins' operation
 * handlers, skill definitions, and create-object entries on their demand events instead of the
 * startup pass. A module is parked only when every capability it provides belongs to a parked
 * family — anything else stays eager. Core plugins stay eager wholesale: boot-time operations
 * (layout restore, navigation) invoke into them before any demand signal could fire.
 *
 * Consumers of all three families read reactively (see
 * `.agents/projects/startup-latency/CONSUMERS.md`); the demand paths are the handler-set
 * resolver (operation invoke), `SpaceEvents.CreateObjectRequested` fire sites, and
 * `ActivationEvents.SkillsRequested` fire sites.
 */
export const getActivationPolicy = (config: PluginConfig): PluginManager.ManagerOptions['activationPolicy'] => {
  const coreKeys = new Set(getCorePlugins(config).map((plugin) => plugin.meta.profile.key));
  const familyEvents: Record<string, (pluginKey: string) => ActivationEvent.ActivationEvent> = {
    [Capabilities.OperationHandler.identifier]: (pluginKey) => ActivationEvents.OperationHandlersRequested(pluginKey),
    [AppCapabilities.SkillDefinition.identifier]: () => ActivationEvents.SkillsRequested,
    [SpaceCapabilities.CreateObjectEntry.identifier]: () => SpaceEvents.CreateObjectRequested,
  };
  return (module) => {
    const pluginKey = module.id.split('.module.')[0];
    if (coreKeys.has(pluginKey)) {
      return undefined;
    }
    const provides = module.activation.provides;
    if (provides.length === 0) {
      return undefined;
    }
    const events = new Map<string, ActivationEvent.ActivationEvent>();
    for (const capability of provides) {
      const makeEvent = familyEvents[capability.identifier];
      if (!makeEvent) {
        return undefined;
      }
      const event = makeEvent(pluginKey);
      events.set(ActivationEvent.eventKey(event), event);
    }
    const unique = [...events.values()];
    return unique.length === 1 ? unique[0] : ActivationEvent.oneOf(...unique);
  };
};
