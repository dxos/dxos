//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { invariant } from '@dxos/invariant';
import { useClient } from '@dxos/react-client';

import { WelcomeScreen } from '../components';

/** Reads the hub URL from client config, which the surface's `props` mapper cannot do. */
export const WelcomeSurface = () => {
  const client = useClient();
  const hubUrl = client.config.values?.runtime?.app?.env?.DX_HUB_URL;
  invariant(hubUrl, 'Hub URL not found');

  return <WelcomeScreen hubUrl={hubUrl} />;
};
