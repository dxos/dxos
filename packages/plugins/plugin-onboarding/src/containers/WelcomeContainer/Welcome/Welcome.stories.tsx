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

import hero from '../../../../assets/hero.webp?url';
import { translations } from '../../../translations.ts';
import { type WelcomeScreenProps, WelcomeState } from './types.ts';
import { Welcome } from './Welcome.tsx';

const DefaultStory = ({ state: initialState = WelcomeState.INIT, ...props }: Partial<WelcomeScreenProps>) => {
  const identity = useIdentity();
  const [state, setState] = useState(initialState);

  return (
    <AlertDialog.Root defaultOpen>
      <AlertDialog.Overlay
        classNames='dark bg-neutral-950! bg-no-repeat bg-center'
        style={{ backgroundImage: `url(${hero})` }}
      >
        <Welcome identity={identity} state={state} onEmailLogin={() => setState(WelcomeState.LOGIN_SENT)} {...props} />
      </AlertDialog.Overlay>
    </AlertDialog.Root>
  );
};

const meta = {
  title: 'apps/composer-app/Welcome',
  component: Welcome as any,
  render: DefaultStory,
  decorators: [withTheme()],
  parameters: {
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** Presence of these handlers is what renders the sign-up tab. */
const signupArgs: Partial<WelcomeScreenProps> = {
  onValidateInvitationCode: () => true,
  onCreateAccount: () => console.log('create account'),
  onJoinWaitlist: () => console.log('join waitlist'),
};

export const Default: Story = {
  decorators: [withClientProvider()],
  args: {
    ...signupArgs,
    onPasskey: () => console.log('passkey'),
    onJoinIdentity: () => console.log('join identity'),
    onRecoverIdentity: () => console.log('recover identity'),
  },
};

/** Passkey login failed because the credential isn't a recovery credential for any account. */
export const PasskeyRejected: Story = {
  decorators: [withClientProvider()],
  args: {
    ...signupArgs,
    error: 'passkey-rejected',
    onPasskey: () => console.log('passkey'),
    onJoinIdentity: () => console.log('join identity'),
    onRecoverIdentity: () => console.log('recover identity'),
  },
};

/** Email is the primary login method (no passkey handler). Used by welcome-focus.spec.ts. */
export const EmailPrimary: Story = {
  decorators: [withClientProvider()],
  args: {
    ...signupArgs,
    onJoinIdentity: () => console.log('join identity'),
    onRecoverIdentity: () => console.log('recover identity'),
    onRecoverWithOAuth: () => console.log('recover oauth'),
  },
};

/**
 * The iOS app's restricted screen: passkey login only — no sign-up tab and no alternative login
 * methods. `onEmailLogin` is explicitly cleared because the story wrapper supplies one by default.
 */
export const PasskeyOnly: Story = {
  decorators: [withClientProvider()],
  args: {
    onEmailLogin: undefined,
    onPasskey: () => console.log('passkey'),
  },
};

export const WithIdentity: Story = {
  decorators: [withClientProvider({ createIdentity: true })],
  // Mirrors what the screen passes once an identity exists: email login plus the waitlist.
  args: {
    onJoinWaitlist: () => console.log('join waitlist'),
  },
};
