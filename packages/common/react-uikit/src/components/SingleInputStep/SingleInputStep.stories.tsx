//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React from 'react';

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
  rootLabel: '',
  inputLabel: '',
  inputPlaceholder: '',
  onNext: () => {},
  onChange: () => {}
});
CreateProfile.args = {
  pending: false,
  rootLabel: 'create profile label',
  inputLabel: 'username label',
  inputPlaceholder: 'username placeholder',
  inputProps: { autoComplete: 'username' }
};

export const JoinSpace = () => (
  <Template
    rootLabel='join space label'
    inputLabel='space invitation label'
    inputPlaceholder='space invitation placeholder'
    backLabel='cancel label'
    nextLabel='redeem invitation label'
    onChange={() => {}}
    onNext={() => {}}
    onBack={() => {}}
  />
);

export const RestoreProfile = () => (
  <Template
    rootLabel='recover profile label'
    inputLabel='seed phrase label'
    inputPlaceholder='seed phrase placeholder'
    nextLabel='validate seed phrase label'
    onChange={() => {}}
    onNext={() => {}}
    onBack={() => {}}
  />
);

export const RestoreProfileWithError = () => (
  <Template
    rootLabel='recover profile label'
    inputLabel='seed phrase label'
    inputPlaceholder='seed phrase placeholder'
    nextLabel='validate seed phrase label'
    onChange={() => {}}
    onNext={() => {}}
    onBack={() => {}}
    inputProps={{
      validationMessage: 'This only has 3 of the required 24 words',
      validationValence: 'error',
      initialValue: 'squirrels potatoes dolphins'
    }}
  />
);
