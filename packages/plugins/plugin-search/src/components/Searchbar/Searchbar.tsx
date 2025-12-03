//
// Copyright 2023 DXOS.org
//

import React, { type KeyboardEvent, useCallback, useEffect, useRef } from 'react';

import { addEventListener } from '@dxos/async';
import { Input, type TextInputProps, type ThemedClassName, Toolbar, useControlledState } from '@dxos/react-ui';

export type SearchbarProps = ThemedClassName<
  Pick<TextInputProps, 'variant' | 'placeholder'> & {
    delay?: number;
    value?: string;
    onChange?: (text?: string) => void;
    onSubmit?: (text?: string) => void;
  }
>;

export const Searchbar = ({ classNames, variant, placeholder, value, onChange, onSubmit }: SearchbarProps) => {
  const [text, setText] = useControlledState(value, onChange);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return addEventListener(window, 'keydown', (event) => {
      if (event.key === 'f' && event.metaKey && event.shiftKey) {
        inputRef.current?.focus();
      }
    });
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      switch (event.key) {
        case 'Enter':
          onSubmit?.(text);
          break;
      }
    },
    [text, onSubmit],
  );

  return (
    <Toolbar.Root classNames={classNames}>
      <Input.Root>
        <Input.TextInput
          ref={inputRef}
          placeholder={placeholder}
          autoFocus
          variant={variant}
          value={text ?? ''}
          onChange={({ target }) => setText(target.value)}
          onKeyDown={handleKeyDown}
        />
      </Input.Root>
    </Toolbar.Root>
  );
};
