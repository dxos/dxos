//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { getEnvString } from '@dxos/config';
import { invariant } from '@dxos/invariant';
import { useClient } from '@dxos/react-client';

import { WelcomeScreen } from './WelcomeScreen.tsx';

/** Reads the hub URL from client config, which the surface's `props` mapper cannot do. */
export const WelcomeContainer = () => {
  const client = useClient();
  const hubUrl = getEnvString(client.config, 'DX_HUB_URL');
  invariant(hubUrl, 'Hub URL not found');

  return <WelcomeScreen hubUrl={hubUrl} />;
};
