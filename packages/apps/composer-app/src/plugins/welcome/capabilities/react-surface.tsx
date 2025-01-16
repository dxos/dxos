//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { useClient } from '@dxos/react-client';

import { WelcomeScreen, WELCOME_SCREEN } from '../components';
import { WELCOME_PLUGIN } from '../meta';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${WELCOME_PLUGIN}/welcome`,
      role: 'main',
      filter: (data): data is any => data.component === WELCOME_SCREEN,
      component: () => {
        const client = useClient();
        const hubUrl = client.config.values?.runtime?.app?.env?.DX_HUB_URL;
        invariant(hubUrl, 'Hub URL not found');
        return <WelcomeScreen hubUrl={hubUrl} />;
      },
    }),
  ]);
