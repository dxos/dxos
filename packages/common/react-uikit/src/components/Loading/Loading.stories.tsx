//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { templateForComponent } from '../../testing';
import { Loading, LoadingColor, LoadingProps, LoadingSize } from './Loading';

export default {
  title: 'react-ui/Loading',
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

const Template = (props: LoadingProps) => (
  <>
    <Loading {...props} />
    <span className='sr-only' id='loading__label-id'>
      Loading…
    </span>
  </>
);

export const Default = templateForComponent(Template)({ labelId: '' });
Default.args = { size: LoadingSize.md, color: LoadingColor.primary };

export const Small = () => (
  <Template labelId='loading__label-id' size={LoadingSize.sm} />
);
export const Neutral = () => (
  <Template labelId='loading__label-id' color={LoadingColor.neutral} />
);
export const Large = () => (
  <Template labelId='loading__label-id' size={LoadingSize.lg} />
);
export const ExtraLarge = () => (
  <Template labelId='loading__label-id' size={LoadingSize.xl} />
);
