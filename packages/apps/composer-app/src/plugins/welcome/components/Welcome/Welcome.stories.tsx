//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import '@fontsource/poiret-one';

import React, { useState } from 'react';

import { withTheme } from '@dxos/storybook-utils';

import { Welcome } from './Welcome';
import { WelcomeState } from './types';
import translations from '../../translations';

export default {
  title: 'plugin-welcome/Welcome',
  component: Welcome,
  decorators: [withTheme],
  parameters: { chromatic: { disableSnapshot: false }, translations },
};

const Container = () => {
  const [state, setState] = useState(WelcomeState.INIT);
  const handleSignup = () => {
    setState(WelcomeState.EMAIL_SENT);
  };

  return <Welcome state={state} onSignup={handleSignup} />;
};

export const Default = () => <Container />;
