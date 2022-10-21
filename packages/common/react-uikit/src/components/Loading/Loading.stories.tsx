//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { templateForComponent } from '../../testing';
import { Loading, LoadingColor, LoadingProps, LoadingSize } from './Loading';

export default {
  title: 'react-uikit/Loading',
  component: Loading,
  argTypes: {
    size: {
      control: 'select',
      options: LoadingSize
    },
    color: {
      control: 'select',
      options: LoadingColor
    }
  }
};

const Template = (props: LoadingProps) => <Loading {...props} />;

export const Default = templateForComponent(Template)({ });
Default.args = { size: LoadingSize.md, color: LoadingColor.primary };

export const Small = () => (
  <Template size={LoadingSize.sm} />
);
export const Neutral = () => (
  <Template color={LoadingColor.neutral} />
);
export const Large = () => (
  <Template size={LoadingSize.lg} />
);
export const ExtraLarge = () => (
  <Template size={LoadingSize.xl} />
);
