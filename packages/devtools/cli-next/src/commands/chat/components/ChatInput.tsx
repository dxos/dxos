//
// Copyright 2025 DXOS.org
//

import { type KeyEvent, type TextareaRenderable } from '@opentui/core';
import { type Accessor, createEffect } from 'solid-js';

import { theme } from '../theme';

type ChatInputProps = {
  focused: boolean;
  height?: number;
  value: Accessor<string>;
  onInput: (value: string) => void;
  onSubmit: () => void;
};

export const ChatInput = ({ focused, height = 4, value, onInput, onSubmit }: ChatInputProps) => {
  let textarea: TextareaRenderable | undefined;

  // Sync signal to textarea (initialValue is not reactive).
  createEffect(() => {
    if (textarea?.editBuffer && textarea.plainText !== value()) {
      textarea.editBuffer.setText(value());
    }
  });

  const handleKeyDown = (event: KeyEvent) => {
    if (event.name === 'return' && !event.shift) {
      event.preventDefault();
      const text = textarea?.plainText ?? '';
      if (text.trim()) {
        onSubmit();
      }
    }
  };

  return (
    <box flexDirection='row' width='100%' height={height}>
      <box width={1} height='100%' border={['right']} borderStyle='heavy' borderColor={theme.accent} />
      <box width='100%' height='100%' paddingLeft={1} paddingRight={1} marginRight={1} backgroundColor={theme.input.bg}>
        <textarea
          ref={textarea}
          width='100%'
          height='100%'
          focused={focused}
          placeholder='Search or ask anything...'
          initialValue={value()}
          onContentChange={() => onInput(textarea?.plainText ?? '')}
          onKeyDown={handleKeyDown}
          onSubmit={onSubmit}
        />
      </box>
    </box>
  );
};
