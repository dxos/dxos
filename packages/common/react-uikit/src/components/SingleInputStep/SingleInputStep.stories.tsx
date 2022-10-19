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
  rootLabelTKey: '',
  inputLabelTKey: '',
  inputPlaceholderTKey: '',
  onClickNext: () => {},
  onChange: () => {}
});
CreateProfile.args = {
  rootLabelTKey: 'create profile label',
  inputLabelTKey: 'username label',
  inputPlaceholderTKey: 'username placeholder',
  autoComplete: 'username'
};

export const JoinSpace = () => (
  <Template
    rootLabelTKey='join space label'
    inputLabelTKey='space invitation label'
    inputPlaceholderTKey='space invitation placeholder'
    backTKey='cancel label'
    nextTKey='redeem invitation label'
    onChange={() => {}}
    onClickNext={() => {}}
    onClickBack={() => {}}
  />
);

export const RestoreProfile = () => (
  <Template
    rootLabelTKey='recover profile label'
    inputLabelTKey='seed phrase label'
    inputPlaceholderTKey='seed phrase placeholder'
    nextTKey='validate seed phrase label'
    onChange={() => {}}
    onClickNext={() => {}}
    onClickBack={() => {}}
  />
);
