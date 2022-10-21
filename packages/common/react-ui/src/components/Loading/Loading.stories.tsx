//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { templateForComponent } from '../../testing';
import { Loading, LoadingProps } from './Loading';

export default {
  title: 'react-uikit/Loading',
  component: Loading,
  argTypes: {
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg', 'xl']
    },
    color: {
      control: 'select',
      options: ['primary', 'neutral']
    }
  }
};

const Template = (props: LoadingProps) => <Loading {...props} />;

export const Default = templateForComponent(Template)({ label: 'Loading' });
Default.args = { label: 'Loading', size: 'md', color: 'primary' };

export const Small = () => <Template label='Loading' size={'sm'} />;
export const Neutral = () => <Template label='Loading' color={'neutral'} />;
export const Large = () => <Template label='Loading' size={'lg'} />;
export const ExtraLarge = () => <Template label='Loading' size={'xl'} />;
