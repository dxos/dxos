//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';
import '@fontsource/poiret-one';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { useIdentity } from '@dxos/react-client/halo';
import { withClientProvider } from '@dxos/react-client/testing';
import { AlertDialog } from '@dxos/react-ui';
import { withTheme } from '@dxos/storybook-utils';

import { translations } from '../../translations';

import { type WelcomeScreenProps, WelcomeState } from './types';
import { OVERLAY_CLASSES, OVERLAY_STYLE, Welcome } from './Welcome';

const Container = ({ state: initialState = WelcomeState.INIT, ...props }: Partial<WelcomeScreenProps>) => {
  const identity = useIdentity();
  const [state, setState] = useState(initialState);

  return (
    <AlertDialog.Root defaultOpen>
      <AlertDialog.Overlay classNames={OVERLAY_CLASSES} style={OVERLAY_STYLE}>
        <Welcome
          identity={identity}
          state={state}
          onSignup={() => setState(WelcomeState.EMAIL_SENT)}
          onGoToLogin={() => setState(WelcomeState.INIT)}
          {...props}
        />
      </AlertDialog.Overlay>
    </AlertDialog.Root>
  );
};

export const Default: Story = {
  args: {
    onPasskey: () => console.log('passkey'),
    onJoinIdentity: () => console.log('join identity'),
    onRecoverIdentity: () => console.log('recover identity'),
  },
  decorators: [withClientProvider()],
};

export const WithIdentity: Story = {
  args: {},
  decorators: [withClientProvider({ createIdentity: true })],
};

export const SpaceInvitation: Story = {
  args: {
    state: WelcomeState.SPACE_INVITATION,
    onPasskey: () => console.log('passkey'),
    onJoinIdentity: () => console.log('join identity'),
    onRecoverIdentity: () => console.log('recover identity'),
    onSpaceInvitation: () => console.log('space invitation'),
  },
  decorators: [withClientProvider()],
};

const meta = {
  title: 'apps/composer-app/Welcome',
  component: Welcome,
  render: Container,
  decorators: [withTheme],
  parameters: {
    translations,
    chromatic: {
      disableSnapshot: false,
    },
  },
} satisfies Meta<typeof Welcome>;

export default meta;

type Story = StoryObj<typeof meta>;
