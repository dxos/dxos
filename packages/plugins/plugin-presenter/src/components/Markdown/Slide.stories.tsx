//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';

import { Slide } from './Slide';
import { createSlide } from '../../testing';

const meta: Meta = {
  title: 'plugins/plugin-presenter/Slide',
  component: Slide,
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = {
  args: {
    content: createSlide(),
  },
};
export default meta;
