//
// Copyright 2023 DXOS.org
//

import '@fontsource/poiret-one';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { useIdentity } from '@dxos/react-client/halo';
import { withClientProvider } from '@dxos/react-client/testing';
import { AlertDialog } from '@dxos/react-ui';
import { withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';

import { type WelcomeScreenProps, WelcomeState } from './types';
import { OVERLAY_CLASSES, OVERLAY_STYLE, Welcome } from './Welcome';

const DefaultStory = ({ state: initialState = WelcomeState.INIT, ...props }: Partial<WelcomeScreenProps>) => {
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

const meta = {
  title: 'apps/composer-app/Welcome',
  component: Welcome as any,
  render: DefaultStory,
  decorators: [withTheme],
  parameters: {
    translations,
    chromatic: {
      disableSnapshot: false,
    },
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [withClientProvider()],
  args: {
    onPasskey: () => console.log('passkey'),
    onJoinIdentity: () => console.log('join identity'),
    onRecoverIdentity: () => console.log('recover identity'),
  },
};

export const WithIdentity: Story = {
  decorators: [withClientProvider({ createIdentity: true })],
  args: {},
};

export const SpaceInvitation: Story = {
  decorators: [withClientProvider()],
  args: {
    state: WelcomeState.SPACE_INVITATION,
    onPasskey: () => console.log('passkey'),
    onJoinIdentity: () => console.log('join identity'),
    onRecoverIdentity: () => console.log('recover identity'),
    onSpaceInvitation: () => console.log('space invitation'),
  },
};
