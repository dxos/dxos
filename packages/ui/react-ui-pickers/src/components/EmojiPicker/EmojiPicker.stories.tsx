//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { EmojiPickerBlock, type EmojiPickerProps, EmojiPickerToolbarButton } from './EmojiPicker';

const ToolbarButtonStory = (props: EmojiPickerProps) => {
  const [emoji, setEmoji] = useState<string>(props.defaultEmoji ?? '😀');

  return (
    <Toolbar.Root>
      <EmojiPickerToolbarButton {...props} emoji={emoji} onChangeEmoji={setEmoji} />
    </Toolbar.Root>
  );
};

const BlockStory = (props: EmojiPickerProps) => {
  const [emoji, setEmoji] = useState<string>(props.defaultEmoji ?? '😀');

  return (
    <div className='flex gap-2'>
      <EmojiPickerBlock
        {...props}
        emoji={emoji}
        onChangeEmoji={setEmoji}
        onClickClear={() => setEmoji(props.defaultEmoji ?? '😀')}
      />
    </div>
  );
};

export const ToolbarButton: StoryObj<EmojiPickerProps> = {
  render: ToolbarButtonStory,
  args: {
    defaultEmoji: '😀',
  },
};

export const Block: StoryObj<EmojiPickerProps> = {
  render: BlockStory,
  args: {
    defaultEmoji: '😀',
  },
};

const meta: Meta = {
  title: 'ui/react-ui-pickers/EmojiPicker',
  decorators: [withTheme, withLayout()],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
