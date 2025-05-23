//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';
import '@fontsource/poiret-one';

import React, { useState } from 'react';

import { useIdentity } from '@dxos/react-client/halo';
import { withClientProvider } from '@dxos/react-client/testing';
import { withTheme } from '@dxos/storybook-utils';

import { Welcome } from './Welcome';
import { type WelcomeScreenProps, WelcomeState } from './types';
import translations from '../../translations';

const Container = ({ state: initialState = WelcomeState.INIT, ...props }: Partial<WelcomeScreenProps>) => {
  const identity = useIdentity();
  const [state, setState] = useState(initialState);

  return (
    <Welcome
      identity={identity}
      state={state}
      onSignup={() => setState(WelcomeState.EMAIL_SENT)}
      onGoToLogin={() => setState(WelcomeState.INIT)}
      {...props}
    />
  );
};

export const Default = {
  args: {
    onPasskey: () => console.log('passkey'),
    onJoinIdentity: () => console.log('join identity'),
    onRecoverIdentity: () => console.log('recover identity'),
  },
  decorators: [withClientProvider()],
};

export const WithIdentity = {
  args: {},
  decorators: [withClientProvider({ createIdentity: true })],
};

export const SpaceInvitation = {
  args: {
    state: WelcomeState.SPACE_INVITATION,
    onPasskey: () => console.log('passkey'),
    onJoinIdentity: () => console.log('join identity'),
    onRecoverIdentity: () => console.log('recover identity'),
    onSpaceInvitation: () => console.log('space invitation'),
  },
  decorators: [withClientProvider()],
};

export default {
  title: 'apps/plugin-welcome/Welcome',
  component: Welcome,
  render: Container,
  decorators: [withTheme],
  parameters: { chromatic: { disableSnapshot: false }, translations },
};
