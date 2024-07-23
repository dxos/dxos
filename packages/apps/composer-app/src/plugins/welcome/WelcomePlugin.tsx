//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { parseClientPlugin } from '@braneframe/plugin-client';
import { CLIENT_PLUGIN, ClientAction } from '@braneframe/plugin-client/meta';
import { HELP_PLUGIN, HelpAction } from '@braneframe/plugin-help/meta';
import {
  type SurfaceProvides,
  type TranslationsProvides,
  parseIntentPlugin,
  resolvePlugin,
  type PluginDefinition,
  NavigationAction,
  LayoutAction,
} from '@dxos/app-framework';
import { type UnsubscribeCallback } from '@dxos/async';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { BetaDialog, WelcomeScreen } from './components';
import { meta } from './meta';
import translations from './translations';
import { removeQueryParamByValue } from '../../util';

const url = new URL(window.location.href);
const TEST_DEPRECATION = /show_beta_notice/.test(url.href);
const TEST_AUTH = /beta_auth/.test(url.href);
const DEPRECATED_DEPLOYMENT =
  url.hostname === 'composer.dxos.org' || url.hostname === 'composer.staging.dxos.org' || TEST_DEPRECATION;
const DEFAULT_HUB_URL = 'http://localhost:8787';

export const WelcomePlugin = (): PluginDefinition<SurfaceProvides & TranslationsProvides> => {
  let unsubscribe: UnsubscribeCallback | undefined;
  let hubUrl: string;

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

      hubUrl = client.config.values?.runtime?.app?.env?.DX_HUB_URL ?? DEFAULT_HUB_URL;

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

      const credentials = await client.halo.queryCredentials();
      const betaCredential = credentials.find(
        (credential) => credential.subject.assertion['@type'] === 'dxos.hub.BetaAccess',
      );
      if (betaCredential) {
        log.info('credential found', { betaCredential });
        return;
      }

      // TODO(wittjosiah): Consider how to make this only apply to `main` branch and not `staging`.
      //   Probably requires bundling and deploying from our CI rather than Cloudflare.
      const skipAuth =
        client.config.values.runtime?.app?.env?.DX_ENVIRONMENT === 'preview' ||
        (location.hostname === 'localhost' && !TEST_AUTH);
      const searchParams = new URLSearchParams(window.location.search);
      const token = searchParams.get('token');

      // If identity already exists, continue with existing identity.
      // If not, only create identity if token is present.
      let identity = client.halo.identity.get();
      if (!identity && (token || skipAuth)) {
        const result = await dispatch({
          plugin: CLIENT_PLUGIN,
          action: ClientAction.CREATE_IDENTITY,
        });
        identity = result?.data;
      }

      if (skipAuth) {
        return;
      }

      // Existing beta users should be able to get the credential w/o a magic link.
      if (identity) {
        try {
          const activateUrl = new URL('/account/activate', hubUrl);
          const response = await fetch(activateUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token, identityDid: identity.identityKey }),
          });
          if (!response.ok) {
            return;
          }

          const { credential } = await response.json();
          // TODO(wittjosiah): Write proper credential.
          await client.halo.writeCredentials([
            {
              issuanceDate: new Date(),
              issuer: identity.identityKey,
              subject: {
                assertion: {
                  '@type': 'dxos.hub.BetaAccess',
                  credential,
                },
                id: PublicKey.random(),
              },
            },
          ]);
          log.info('credential saved', { credential });
          token && removeQueryParamByValue(token);
        } catch (err) {
          log.catch(err);
        }

        await dispatch({ plugin: HELP_PLUGIN, action: HelpAction.START });

        return;
      }

      await dispatch({
        action: NavigationAction.OPEN,
        // NOTE: Active parts cannot contain '/' characters currently.
        data: { activeParts: { fullScreen: 'surface:WelcomeScreen' } },
      });

      // TODO(wittjosiah): Query for credential in HALO and skip welcome dialog if it exists.
      unsubscribe = client.halo.credentials.subscribe((credentials) => {
        const betaCredential = credentials.find((credential) => {
          return credential.subject.assertion['@type'] === 'dxos.hub.BetaAccess';
        });
        if (betaCredential) {
          log.info('found beta credential', betaCredential);
          void dispatch({
            action: NavigationAction.CLOSE,
            data: { activeParts: { fullScreen: 'surface:WelcomeScreen' } },
          });
        }
      }).unsubscribe;
    },
    unload: async () => {
      unsubscribe?.();
    },
    provides: {
      surface: {
        component: ({ data, role }) => {
          if (role === 'dialog' && data.component === `${meta.id}/BetaDialog`) {
            return <BetaDialog />;
          }

          if (role === 'main' && data.component === 'WelcomeScreen') {
            return <WelcomeScreen hubUrl={hubUrl} />;
          }

          return null;
        },
      },
      translations,
    },
  };
};
