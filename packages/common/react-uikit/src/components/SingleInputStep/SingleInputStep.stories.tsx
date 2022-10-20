//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { MessageValence } from '@dxos/react-ui';

import { templateForComponent } from '../../testing';
import { SingleInputStep, SingleInputStepProps } from './SingleInputStep';

export default {
  title: 'react-uikit/SingleInputStep',
  component: SingleInputStep,
  argTypes: {
    onClickBack: { action: 'back' },
    onClickNext: { action: 'next' },
    onChangeUsername: { action: 'change' }
  }
};

const Template = (args: SingleInputStepProps) => (
  <SingleInputStep {...args} className='max-w-md mx-auto my-4' />
);

export const CreateProfile = templateForComponent(Template)({
  rootLabelTKey: '',
  inputLabelTKey: '',
  inputPlaceholderTKey: '',
  onNext: () => {},
  onChange: () => {}
});
CreateProfile.args = {
  pending: false,
  rootLabelTKey: 'create profile label',
  inputLabelTKey: 'username label',
  inputPlaceholderTKey: 'username placeholder',
  inputProps: { autoComplete: 'username' }
};

export const JoinSpace = () => (
  <Template
    rootLabelTKey='join space label'
    inputLabelTKey='space invitation label'
    inputPlaceholderTKey='space invitation placeholder'
    backTKey='cancel label'
    nextTKey='redeem invitation label'
    onChange={() => {}}
    onNext={() => {}}
    onBack={() => {}}
  />
);

export const RestoreProfile = () => (
  <Template
    rootLabelTKey='recover profile label'
    inputLabelTKey='seed phrase label'
    inputPlaceholderTKey='seed phrase placeholder'
    nextTKey='validate seed phrase label'
    onChange={() => {}}
    onNext={() => {}}
    onBack={() => {}}
  />
);

export const RestoreProfileWithError = () => (
  <Template
    rootLabelTKey='recover profile label'
    inputLabelTKey='seed phrase label'
    inputPlaceholderTKey='seed phrase placeholder'
    nextTKey='validate seed phrase label'
    onChange={() => {}}
    onNext={() => {}}
    onBack={() => {}}
    inputProps={{
      validationMessage: 'This only has 3 of the required 24 words',
      validationValence: MessageValence.error,
      initialValue: 'squirrels potatoes dolphins'
    }}
  />
);
