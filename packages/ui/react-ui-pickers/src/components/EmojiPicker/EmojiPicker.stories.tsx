//
// Copyright 2025 DXOS.org
//

import EmojiPicker from '@emoji-mart/react';
import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { EmojiPickerBlock, type EmojiPickerProps, EmojiPickerToolbarButton } from './EmojiPicker.tsx';

const meta = {
  title: 'ui/react-ui-pickers/EmojiPicker',
  component: EmojiPicker,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
} satisfies Meta<typeof EmojiPicker>;

export default meta;

const ToolbarButtonStory = (props: EmojiPickerProps) => {
  const [emoji, setEmoji] = useState<string>(props.defaultEmoji ?? '\u{1F600}');

  return (
    <Toolbar.Root>
      <EmojiPickerToolbarButton {...props} emoji={emoji} onChangeEmoji={setEmoji} />
    </Toolbar.Root>
  );
};

const BlockStory = (props: EmojiPickerProps) => {
  const [emoji, setEmoji] = useState<string>(props.defaultEmoji ?? '\u{1F600}');

  return (
    <div>
      <EmojiPickerBlock
        {...props}
        emoji={emoji}
        onChangeEmoji={setEmoji}
        onClickClear={() => setEmoji(props.defaultEmoji ?? '\u{1F600}')}
      />
    </div>
  );
};

export const ToolbarButton: StoryObj<EmojiPickerProps> = {
  render: ToolbarButtonStory,
  args: {
    defaultEmoji: '\u{1F600}',
  },
};

export const Block: StoryObj<EmojiPickerProps> = {
  render: BlockStory,
  args: {
    defaultEmoji: '\u{1F600}',
  },
};
