//
// Copyright 2024 DXOS.org
//

import React from 'react';

import {
  type SurfaceProvides,
  type TranslationsProvides,
  parseIntentPlugin,
  resolvePlugin,
  type PluginDefinition,
  LayoutAction,
  parseLayoutPlugin,
} from '@dxos/app-framework';
import { type Trigger } from '@dxos/async';
import { parseClientPlugin } from '@dxos/plugin-client';

import { BetaDialog, WelcomeScreen } from './components';
import { meta } from './meta';
import { OnboardingManager } from './onboarding-manager';
import translations from './translations';

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
  let manager: OnboardingManager | undefined;

  return {
    meta,
    ready: async (plugins) => {
      const dispatch = resolvePlugin(plugins, parseIntentPlugin)?.provides.intent.dispatch;
      const client = resolvePlugin(plugins, parseClientPlugin)?.provides.client;
      const layout = resolvePlugin(plugins, parseLayoutPlugin)?.provides.layout;
      if (!client || !dispatch || !layout) {
        // NOTE: This will skip the welcome dialog but app is pretty much unusable without client.
        // Generally, if the client is not available, the global error boundary should be triggered.
        return;
      }

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

      const searchParams = new URLSearchParams(window.location.search);
      hubUrl = client.config.values?.runtime?.app?.env?.DX_HUB_URL;
      manager = new OnboardingManager({
        dispatch,
        client,
        layout,
        firstRun,
        hubUrl,
        token: searchParams.get('token') ?? undefined,
        recoverIdentity: searchParams.get('recoverIdentity') === 'true',
        deviceInvitationCode: searchParams.get('deviceInvitationCode') ?? undefined,
        spaceInvitationCode: searchParams.get('spaceInvitationCode') ?? undefined,
      });
      await manager.initialize();
    },
    unload: async () => {
      await manager?.destroy();
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
