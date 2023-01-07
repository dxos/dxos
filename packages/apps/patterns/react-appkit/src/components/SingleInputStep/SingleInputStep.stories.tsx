//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { Group, mx, useTranslation } from '@dxos/react-components';

import { SingleInputStep, SingleInputStepProps } from './SingleInputStep';

export default {
  component: SingleInputStep,
  argTypes: {
    onClickBack: { action: 'back' },
    onClickNext: { action: 'next' },
    onChangeDisplayName: { action: 'change' }
  }
};

const render = ({ rootLabel, ...args }: SingleInputStepProps & { rootLabel: string }) => {
  const { t } = useTranslation('appkit');
  return (
    <Group
      elevation={5}
      label={{
        level: 1,
        className: 'mb-2 text-3xl',
        children: t(rootLabel)
      }}
      className={mx('p-5 rounded-xl max-w-md mx-auto my-4')}
    >
      <SingleInputStep {...args} className='max-w-md mx-auto my-4' />
    </Group>
  );
};

export const CreateProfile = {
  render,
  args: {
    pending: false,
    rootLabel: 'create profile label',
    inputLabel: 'displayName label',
    inputPlaceholder: 'displayName placeholder',
    inputProps: { slots: { input: { autoComplete: 'displayName' } } }
  }
};

export const JoinSpace = {
  render,
  args: {
    rootLabel: 'join space label',
    inputLabel: 'invitation code label',
    inputPlaceholder: 'invitation code placeholder',
    backLabel: 'cancel label',
    nextLabel: 'redeem invitation label',
    onChange: () => {},
    onNext: () => {},
    onBack: () => {}
  }
};

export const RestoreProfile = {
  render,
  args: {
    rootLabel: 'recover profile label',
    inputLabel: 'seed phrase label',
    inputPlaceholder: 'seed phrase placeholder',
    nextLabel: 'validate seed phrase label',
    onChange: () => {},
    onNext: () => {},
    onBack: () => {}
  }
};

export const RestoreProfileWithError = {
  render,
  args: {
    rootLabel: 'recover profile label',
    inputLabel: 'seed phrase label',
    inputPlaceholder: 'seed phrase placeholder',
    nextLabel: 'validate seed phrase label',
    onChange: () => {},
    onNext: () => {},
    onBack: () => {},
    inputProps: {
      validationMessage: 'This only has 3 of the required 24 words',
      validationValence: 'error',
      initialValue: 'squirrels potatoes dolphins'
    }
  }
};
