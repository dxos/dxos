//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { templateForComponent } from '../../testing';
import { AuthChoices, AuthChoicesProps } from './AuthChoices';

export default {
  title: 'react-uikit/AuthChoices',
  component: AuthChoices,
  argTypes: {
    onCreate: { action: 'create' },
    onRecover: { action: 'recover' },
    onInviteDevice: { action: 'inviteDevice' }
  }
};

const Template = (args: AuthChoicesProps) => (
  <AuthChoices {...args} className='max-w-md mx-auto my-4' />
);

export const Default = templateForComponent(Template)({});
Default.args = {};
