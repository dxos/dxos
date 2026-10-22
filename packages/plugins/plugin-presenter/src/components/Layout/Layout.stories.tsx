//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { createSlide } from '#testing';

import { Slide } from '../Slide/index.ts';
import { Layout, type LayoutProps } from './Layout.tsx';

const Corner = ({ label }: { label: string }) => (
  <span className='rounded-sm bg-white/10 px-2 py-1 font-mono text-sm'>{label}</span>
);

const DefaultStory = (props: LayoutProps) => (
  <Layout
    topLeft={<Corner label='top-left' />}
    topRight={<Corner label='top-right' />}
    bottomLeft={<Corner label='bottom-left' />}
    bottomRight={<Corner label='bottom-right' />}
    {...props}
  >
    <Slide content={createSlide({ number: 1, list: 3 })} />
  </Layout>
);

const meta = {
  title: 'plugins/plugin-presenter/components/Layout',
  component: Layout,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Layout>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
