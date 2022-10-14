//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { templateForComponent } from '../../dev-util';
import { Loading, LoadingProps } from './Loading';

export default {
  title: 'react-ui/Loading',
  component: Loading
};

const Template = (props: LoadingProps) => <Loading {...props} />;

export const Default = templateForComponent(Template)({});
Default.args = { size: 'md' };

export const Small = templateForComponent(Template)({});
Small.args = { size: 'sm' };

export const Large = templateForComponent(Template)({});
Large.args = { size: 'lg' };

export const ExtraLarge = templateForComponent(Template)({});
ExtraLarge.args = { size: 'xl' };
