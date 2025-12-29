//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capability, Common } from '@dxos/app-framework';
import { invariant } from '@dxos/invariant';
import { useClient } from '@dxos/react-client';

import { WELCOME_SCREEN, WelcomeScreen } from '../components';
import { meta } from '../meta';

export default Capability.makeModule(() =>
  Capability.contributes(Common.Capability.ReactSurface, [
    Common.createSurface({
      id: `${meta.id}/welcome`,
      role: 'dialog',
      filter: (data): data is any => data.component === WELCOME_SCREEN,
      component: () => {
        const client = useClient();
        const hubUrl = client.config.values?.runtime?.app?.env?.DX_HUB_URL;
        invariant(hubUrl, 'Hub URL not found');
        return <WelcomeScreen hubUrl={hubUrl} />;
      },
    }),
  ]),
);
