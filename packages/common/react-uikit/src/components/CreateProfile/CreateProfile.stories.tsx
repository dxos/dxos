//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { templateForComponent } from '../../testing';
import { CreateProfile, CreateProfileProps } from './CreateProfile';

export default {
  title: 'react-uikit/CreateProfile',
  component: CreateProfile,
  argTypes: {
    onClickBack: { action: 'back' },
    onClickNext: { action: 'next' },
    onChangeUsername: { action: 'change' }
  }
};

const Template = (args: CreateProfileProps) => (
  <CreateProfile {...args} className='max-w-md mx-auto my-4' />
);

export const Default = templateForComponent(Template)({ onClickNext: () => {}, onChangeUsername: () => {} });
Default.args = {};
