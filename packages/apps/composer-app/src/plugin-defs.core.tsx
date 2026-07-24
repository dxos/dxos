//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type Plugin, ProcessManagerPlugin } from '@dxos/app-framework';
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
import { RegistryPlugin } from '@dxos/plugin-registry/plugin';
import { RoutinePlugin } from '@dxos/plugin-routine/plugin';
import { SettingsPlugin } from '@dxos/plugin-settings/plugin';
import { SimpleLayoutPlugin } from '@dxos/plugin-simple-layout/plugin';
import { SpacePlugin } from '@dxos/plugin-space/plugin';
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
