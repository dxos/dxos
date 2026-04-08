//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit';
import { invariant } from '@dxos/invariant';
import { useClient } from '@dxos/react-client';

import {
  ABOUT_DIALOG,
  AboutDialog,
  NATIVE_REDIRECT_DIALOG,
  NativeRedirectDialog,
  WELCOME_SCREEN,
  WelcomeScreen,
} from '../components';
import { meta } from '../meta';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: `${meta.id}.welcome`,
        role: 'dialog',
        filter: AppSurface.component(WELCOME_SCREEN),
        component: () => {
          const client = useClient();
          const hubUrl = client.config.values?.runtime?.app?.env?.DX_HUB_URL;
          invariant(hubUrl, 'Hub URL not found');
          return <WelcomeScreen hubUrl={hubUrl} />;
        },
      }),
      Surface.create({
        id: `${meta.id}.native-redirect`,
        role: 'dialog',
        filter: AppSurface.component(NATIVE_REDIRECT_DIALOG),
        component: ({ data }) => <NativeRedirectDialog {...data.props} />,
      }),
      Surface.create({
        id: ABOUT_DIALOG,
        role: 'dialog',
        filter: AppSurface.component(ABOUT_DIALOG),
        component: () => <AboutDialog />,
      }),
    ]),
  ),
);
