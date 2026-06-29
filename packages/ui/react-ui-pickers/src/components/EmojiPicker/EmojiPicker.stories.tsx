//
// Copyright 2025 DXOS.org
//

import EmojiPicker from '@emoji-mart/react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { type EmojiPickerProps, EmojiPickerBlock, EmojiPickerToolbarButton } from './EmojiPicker';

const meta = {
  title: 'ui/react-ui-pickers/EmojiPicker',
  component: EmojiPicker,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
} satisfies Meta<typeof EmojiPicker>;

export default meta;

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
    <div>
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
