//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';


import { withAttention } from '../testing';

import { useAttentionAttributes } from './AttentionProvider';

const Attendable = ({ id }: { id: string }) => {
  const attentionAttrs = useAttentionAttributes(id);

  return (
    <div {...attentionAttrs}>
      <textarea className='attention-surface resize-none' placeholder={id} />
    </div>
  );
};

const Story = () => {
  return (
    <div className='flex justify-between'>
      <Attendable id='1' />
      <Attendable id='2' />
      <Attendable id='3' />
      <Attendable id='4' />
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-attention/AttentionProvider',
  render: Story,
  decorators: [withAttention],
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
