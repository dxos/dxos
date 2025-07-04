//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react-vite';

import { Slide } from './Slide';
import { createSlide } from '../../testing';

const meta: Meta = {
  title: 'plugins/plugin-presenter/Slide',
  component: Slide,
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

export const Default = {
  args: {
    content: createSlide(),
  },
};

export const Code = {
  args: {
    content: createSlide({ code: true }),
  },
};
