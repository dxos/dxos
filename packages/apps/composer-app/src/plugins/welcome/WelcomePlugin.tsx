//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { parseClientPlugin } from '@dxos/plugin-client';
import { CLIENT_PLUGIN, ClientAction } from '@dxos/plugin-client/meta';
import { HELP_PLUGIN, HelpAction } from '@dxos/plugin-help/meta';
import { ObservabilityAction } from '@dxos/plugin-observability/meta';
import {
  type SurfaceProvides,
  type TranslationsProvides,
  parseIntentPlugin,
  resolvePlugin,
  type PluginDefinition,
  NavigationAction,
  LayoutAction,
} from '@dxos/app-framework';
import { type Trigger } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { BetaDialog, WelcomeScreen } from './components';
import { activateAccount, getProfile, matchServiceCredential, upgradeCredential } from './credentials';
import { meta } from './meta';
import translations from './translations';
import { removeQueryParamByValue } from '../../util';

const url = new URL(window.location.href);
const TEST_DEPRECATION = /beta_notice/.test(url.href);
const DEPRECATED_DEPLOYMENT =
  url.hostname === 'composer.dxos.org' || url.hostname === 'composer.staging.dxos.org' || TEST_DEPRECATION;

export const WelcomePlugin = ({
  firstRun,
}: {
  firstRun?: Trigger;
}): PluginDefinition<SurfaceProvides & TranslationsProvides> => {
  let hubUrl: string | undefined;

  return {
    meta,
    ready: async (plugins) => {
      const dispatch = resolvePlugin(plugins, parseIntentPlugin)?.provides.intent.dispatch;
      const client = resolvePlugin(plugins, parseClientPlugin)?.provides.client;
      if (!client || !dispatch) {
        // NOTE: This will skip the welcome dialog but app is pretty much unusable without client.
        // Generally, if the client is not available, the global error boundary should be triggered.
        return;
      }

      hubUrl = client.config.values?.runtime?.app?.env?.DX_HUB_URL;

      if (DEPRECATED_DEPLOYMENT) {
        await dispatch({
          action: LayoutAction.SET_LAYOUT,
          data: {
            element: 'dialog',
            state: true,
            component: `${meta.id}/BetaDialog`,
          },
        });

        return;
      }

      const credential = client.halo
        .queryCredentials()
        .toSorted((a, b) => b.issuanceDate.getTime() - a.issuanceDate.getTime())
        .find(matchServiceCredential(['composer:beta']));
      if (credential && hubUrl) {
        log('beta credential found', { credential });
        // TODO(wittjosiah): If id is required to present credentials, then it should always be present for queried credentials.
        invariant(credential.id, 'beta credential missing id');
        const presentation = await client.halo.presentCredentials({ ids: [credential.id] });
        const { capabilities } = await getProfile({ hubUrl, presentation });
        const newCapabilities = capabilities.filter(
          (capability) => !credential.subject.assertion.capabilities.includes(capability),
        );
        if (newCapabilities.length > 0) {
          log('upgrading beta credential', { newCapabilities });
          const newCredential = await upgradeCredential({ hubUrl, presentation });
          await client.halo.writeCredentials([newCredential]);
        }
        return;
      }

      // TODO(burdon): Factor out credentials helpers to hub-client.
      const skipAuth = client.config.values.runtime?.app?.env?.DX_ENVIRONMENT === 'main' || !hubUrl;
      const searchParams = new URLSearchParams(window.location.search);
      const token = searchParams.get('token') ?? undefined;

      // If identity already exists, continue with existing identity.
      // If not, only create identity if token is present.
      let identity = client.halo.identity.get();
      if (!identity && (token || skipAuth)) {
        const result = await dispatch({
          plugin: CLIENT_PLUGIN,
          action: ClientAction.CREATE_IDENTITY,
        });
        firstRun?.wake();
        identity = result?.data;
      }

      if (skipAuth) {
        return;
      }

      // Existing beta users should be able to get the credential w/o a magic link.
      if (hubUrl && identity) {
        try {
          const credential = await activateAccount({ hubUrl, identity, token });
          await client.halo.writeCredentials([credential]);
          log('beta credential saved', { credential });
          token && removeQueryParamByValue(token);
          await dispatch([
            {
              action: LayoutAction.SET_LAYOUT_MODE,
              data: { layoutMode: 'solo' },
            },
            {
              action: NavigationAction.CLOSE,
              data: { activeParts: { fullScreen: 'surface:WelcomeScreen' } },
            },
            { plugin: HELP_PLUGIN, action: HelpAction.START },
          ]);
          return;
        } catch {
          // No-op. This is expected for referred users who have an identity but no token yet.
        }
      }

      await dispatch([
        {
          action: LayoutAction.SET_LAYOUT_MODE,
          data: { layoutMode: 'fullscreen' },
        },
        {
          action: NavigationAction.OPEN,
          // NOTE: Active parts cannot contain '/' characters currently.
          data: { activeParts: { fullScreen: 'surface:WelcomeScreen' } },
        },
        {
          action: ObservabilityAction.SEND_EVENT,
          data: { name: 'welcome.presented' },
        },
      ]);

      // Query for credential in HALO and skip welcome dialog if it exists.
      const subscription = client.halo.credentials.subscribe(async (credentials) => {
        const credential = credentials.find(matchServiceCredential(['composer:beta']));
        if (credential) {
          log('beta credential found', { credential });
          await dispatch([
            {
              action: LayoutAction.SET_LAYOUT_MODE,
              data: { layoutMode: 'solo' },
            },
            {
              action: NavigationAction.CLOSE,
              data: { activeParts: { fullScreen: 'surface:WelcomeScreen' } },
            },
          ]);
          subscription.unsubscribe();
        }
      });
    },
    provides: {
      surface: {
        component: ({ data, role }) => {
          if (role === 'dialog' && data.component === `${meta.id}/BetaDialog`) {
            return <BetaDialog />;
          }

          if (role === 'main' && data.component === 'WelcomeScreen' && hubUrl) {
            return <WelcomeScreen hubUrl={hubUrl} firstRun={firstRun} />;
          }

          return null;
        },
      },
      translations,
    },
  };
};
