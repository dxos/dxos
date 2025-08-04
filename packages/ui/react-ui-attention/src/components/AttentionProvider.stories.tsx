//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { withTheme } from '@dxos/storybook-utils';

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

export default {
  title: 'ui/react-ui-attention/AttentionProvider',
  render: Story,
  decorators: [withTheme, withAttention],
};

export const Default = {};
