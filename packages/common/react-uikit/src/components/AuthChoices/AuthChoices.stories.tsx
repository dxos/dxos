//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { templateForComponent } from '../../dev-util';
import { AuthChoices, AuthChoicesProps } from './AuthChoices';

export default {
  title: 'react-uikit/AuthChoices',
  component: AuthChoices
};

const Template = (args: AuthChoicesProps) => <AuthChoices {...args} />;

export const Default = templateForComponent(Template)({});
Default.args = { create: true };
