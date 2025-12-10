//
// Copyright 2025 DXOS.org
//

import { type KeyEvent, type TextareaRenderable } from '@opentui/core';
import { type Accessor, createEffect, useContext } from 'solid-js';

import { theme } from '../theme';

import { AppContext } from './App';

type ChatInputProps = {
  height?: number;
  value: Accessor<string>;
  onInput: (value: string) => void;
  onSubmit: () => void;
};

export const ChatInput = (props: ChatInputProps) => {
  let textarea: TextareaRenderable | undefined;
  const context = useContext(AppContext);

  // Sync signal to textarea (initialValue is not reactive).
  createEffect(() => {
    if (textarea?.editBuffer && textarea.plainText !== props.value()) {
      textarea.editBuffer.setText(props.value());
    }
  });

  const handleKeyDown = (event: KeyEvent) => {
    if (event.name === 'return' && !event.shift) {
      event.preventDefault();
      const text = textarea?.plainText ?? '';
      if (text.trim()) {
        props.onSubmit();
      }
    }
  };

  return (
    <box flexDirection='row' width='100%' height={props.height ?? 4}>
      <box width={1} height='100%' border={['right']} borderStyle='heavy' borderColor={theme.accent} />
      <box width='100%' height='100%' paddingLeft={1} paddingRight={1} marginRight={1} backgroundColor={theme.input.bg}>
        <textarea
          ref={textarea}
          width='100%'
          height='100%'
          focused={context?.focus?.() === 'input'}
          placeholder='Search or ask anything...'
          initialValue={props.value()}
          onContentChange={() => props.onInput(textarea?.plainText ?? '')}
          onKeyDown={handleKeyDown}
          onSubmit={props.onSubmit}
        />
      </box>
    </box>
  );
};
