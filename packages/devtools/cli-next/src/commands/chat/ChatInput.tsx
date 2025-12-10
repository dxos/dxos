//
// Copyright 2025 DXOS.org
//

import { type KeyEvent } from '@opentui/core';
import { type Accessor, createEffect } from 'solid-js';

import { theme } from './theme';

type ChatInputProps = {
  focused: boolean;
  value: Accessor<string>;
  onInput: (value: string) => void;
  onSubmit: () => void;
};

export const ChatInput = ({ focused, value, onInput, onSubmit }: ChatInputProps) => {
  let textareaRef: any;

  // Sync signal to textarea (initialValue is not reactive).
  createEffect(() => {
    if (textareaRef?.editBuffer && textareaRef.plainText !== value()) {
      textareaRef.editBuffer.setText(value());
    }
  });

  const handleKeyDown = (event: KeyEvent) => {
    if (event.name === 'return' && !event.shift) {
      event.preventDefault();
      const text = textareaRef?.plainText ?? '';
      if (text.trim()) {
        onSubmit();
      }
    }
  };

  return (
    <box width='100%' height={4} flexDirection='row'>
      <box width={1} height='100%' border={['right']} borderColor={theme.accent} />
      <box width='100%' height='100%' paddingLeft={1} paddingRight={1} marginRight={1} backgroundColor={theme.input.bg}>
        <textarea
          ref={textareaRef}
          width='100%'
          height='100%'
          focused={focused}
          placeholder='Search or ask anything...'
          initialValue={value()}
          onContentChange={() => onInput(textareaRef?.plainText ?? '')}
          onKeyDown={handleKeyDown}
          onSubmit={onSubmit}
        />
      </box>
    </box>
  );
};
