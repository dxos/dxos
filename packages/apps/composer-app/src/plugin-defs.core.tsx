//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ProcessManagerPlugin } from '@dxos/app-framework';
import type * as Plugin from '@dxos/app-framework/Plugin';
import * as NativePasskey from '@dxos/app-toolkit/NativePasskey';
import { type Client, type ClientServicesProvider, type Config } from '@dxos/client';
import { type IdbLogStore } from '@dxos/log-store-idb';
import { type Observability } from '@dxos/observability';
import * as AtprotoPlugin from '@dxos/plugin-atproto/AtprotoPlugin';
import * as AttentionPlugin from '@dxos/plugin-attention/AttentionPlugin';
import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import * as ConnectorPlugin from '@dxos/plugin-connector/ConnectorPlugin';
import * as DeckPlugin from '@dxos/plugin-deck/DeckPlugin';
import * as GraphPlugin from '@dxos/plugin-graph/GraphPlugin';
import * as MobilePlugin from '@dxos/plugin-mobile/MobilePlugin';
import * as NativePlugin from '@dxos/plugin-native/NativePlugin';
import * as NavTreePlugin from '@dxos/plugin-navtree/NavTreePlugin';
import * as ObservabilityPlugin from '@dxos/plugin-observability/ObservabilityPlugin';
import * as OnboardingPlugin from '@dxos/plugin-onboarding/OnboardingPlugin';
import * as PreviewPlugin from '@dxos/plugin-preview/PreviewPlugin';
import * as ProgressPlugin from '@dxos/plugin-progress/ProgressPlugin';
import * as PwaPlugin from '@dxos/plugin-pwa/PwaPlugin';
import * as RegistryPlugin from '@dxos/plugin-registry/RegistryPlugin';
import * as RoutinePlugin from '@dxos/plugin-routine/RoutinePlugin';
import * as SearchPlugin from '@dxos/plugin-search/SearchPlugin';
import * as SettingsPlugin from '@dxos/plugin-settings/SettingsPlugin';
import * as SpacePlugin from '@dxos/plugin-space/SpacePlugin';
import * as SpotlightPlugin from '@dxos/plugin-spotlight/SpotlightPlugin';
import * as StatusBarPlugin from '@dxos/plugin-status-bar/StatusBarPlugin';
import * as SupportPlugin from '@dxos/plugin-support/SupportPlugin';
import * as ThemePlugin from '@dxos/plugin-theme/ThemePlugin';
import { isTruthy } from '@dxos/util';

import { downloadLogs } from './util';

const APP_LINK_ORIGIN = new URL('https://' + NativePasskey.APP_DOMAIN).origin;

export type State = {
  appKey: string;
  config: Config;
  services: ClientServicesProvider;
  /** Constructed and initializing at the entry point, so the handshake overlaps plugin loading. */
  client: Client;
  observability: Promise<Observability.Observability>;
  logStore: IdbLogStore;
};

export type PluginConfig = State & {
  /** Raises a fatal client-initialization failure to the entry point (see `onFatalError` in main.tsx). */
  onFatalError?: (error: unknown) => void;
  externalPlugins?: boolean;
  isDev?: boolean;
  isLocal?: boolean;
  isPwa?: boolean;
  isTauri?: boolean;
  isStrict?: boolean;
  isPopover?: boolean;
  isMobile?: boolean;
};

/**
 * Infrastructure plugins shared by every plugin set (`plugin-defs.tsx`,
 * `plugin-defs.production.tsx` and `plugin-defs.mobile.tsx`) — options here are the single source of
 * truth.
 *
 * **Every `system`-tagged plugin belongs in this list, and every plugin in this list is
 * `tags: ['system']`** (force-enabled, never a user-facing toggle). The two must agree, in both
 * directions.
 *
 * That agreement is maintained BY HAND, and has to be for now: deriving the list by filtering one
 * catalog of every plugin on the tag would put every plugin in the module graph — the import is what
 * bundles it, so a build-time list is the only thing that keeps the non-shipped ones out (see
 * `DX_PLUGIN_SET` in vite.config.ts). Adding a `system` plugin therefore means adding it here too.
 */
export const getCorePlugins = ({
  appKey,
  config,
  services,
  client,
  observability,
  logStore,
  onFatalError,
  externalPlugins = true,
  isLocal,
  isPwa,
  isTauri,
  isPopover,
  isMobile,
}: PluginConfig): Plugin.Plugin[] => {
  // Mobile is two plugins, not one: headless Deck (state/ops, no root/surfaces) plus Mobile (root +
  // surfaces) rendering over it — one state machine, plugin-mobile is only ever the renderer.
  const layoutPlugins: Plugin.Plugin[] = isPopover
    ? [SpotlightPlugin.make()]
    : isMobile
      ? [DeckPlugin.make({ platform: 'mobile' }), MobilePlugin.make()]
      : [DeckPlugin.make({ platform: 'desktop' })];
  const origin = isTauri ? APP_LINK_ORIGIN : window.location.origin;
  return [
    AtprotoPlugin.make(),
    AttentionPlugin.make(),
    ClientPlugin.make({
      client,
      config,
      services,
      shareableLinkOrigin: origin,
      // plugin-onboarding owns invitation URL params in Composer.
      invitationUrlHandler: false,
      // Inverse of the onboarding gate (`DX_HUB_URL` present => welcome screen): where the gate
      // runs it already offers joining a device and recovering an identity on a clean profile, so
      // the storage-wiping variants are only wanted in local testing.
      identityTestActions: !config.values.runtime?.app?.env?.DX_HUB_URL,
      // The forked init is outside the render tree, so a failure or a stalled handshake reaches
      // the user only if the entry point raises it — React never sees one.
      onClientInitializationError: ({ error }) => Effect.sync(() => onFatalError?.(error)),
      onReset: ({ target }) =>
        Effect.sync(() => {
          localStorage.clear();
          if (target === 'deviceInvitation') {
            // Carry a pending invitation code across the reset so the join can complete.
            const url = new URL('/', window.location.origin);
            url.searchParams.set(
              'deviceInvitationCode',
              new URLSearchParams(window.location.search).get('deviceInvitationCode') ?? '',
            );
            window.location.assign(url);
          } else if (target === 'recoverIdentity') {
            window.location.assign(new URL('/?recoverIdentity=true', window.location.origin));
          } else {
            window.location.pathname = '/';
          }
        }),
    }),
    // Core because it owns the connector machinery itself, not any one integration: it fires
    // `SetupConnectors` (the event every connector-contributing plugin activates on), registers the
    // Connection/AccessToken/Cursor schema, and runs the coordinator that materializes and binds
    // targets. Without it a plugin like Inbox contributes connectors nobody ever asks for.
    ConnectorPlugin.make(),
    GraphPlugin.make(),
    ...layoutPlugins,
    NavTreePlugin.make(),
    ObservabilityPlugin.make({
      namespace: appKey,
      observability: () => observability,
      downloadLogs: () => downloadLogs(logStore),
    }),
    OnboardingPlugin.make({ generateExemplarSpace: !isLocal }),
    isTauri && !isMobile && !isPopover && NativePlugin.make(),
    PreviewPlugin.make(),
    ProcessManagerPlugin(),
    ProgressPlugin.make(),
    !isTauri && isPwa && PwaPlugin.make(),
    RegistryPlugin.make({ externalPlugins }),
    RoutinePlugin.make(),
    SearchPlugin.make(),
    SettingsPlugin.make(),
    SpacePlugin.make({
      observability: true,
      shareableLinkOrigin: origin,
      // plugin-onboarding owns invitation URL params in Composer.
      invitationUrlHandler: false,
    }),
    StatusBarPlugin.make(),
    SupportPlugin.make({ helpSteps: () => import('./util/help').then(({ steps }) => steps) }),
    ThemePlugin.make({
      appName: 'Composer',
      platform: isMobile ? 'mobile' : 'desktop',
    }),
  ].filter(isTruthy);
};
