//
// Copyright 2025 DXOS.org
//

import React, { Suspense, lazy } from 'react';

import { invariant } from '@dxos/invariant';
import { useClient } from '@dxos/react-client';

/**
 * The welcome screen and its artwork are onboarding-only, but the surface that renders them is
 * registered in every tab — so the component loads when the dialog is actually shown.
 */
const WelcomeScreen = lazy(() =>
  import('../components/WelcomeScreen').then(({ WelcomeScreen }) => ({ default: WelcomeScreen })),
);

/** Reads the hub URL from client config, which the surface's `props` mapper cannot do. */
export const WelcomeSurface = () => {
  const client = useClient();
  const hubUrl = client.config.values?.runtime?.app?.env?.DX_HUB_URL;
  invariant(hubUrl, 'Hub URL not found');

  return (
    <Suspense fallback={null}>
      <WelcomeScreen hubUrl={hubUrl} />
    </Suspense>
  );
};
