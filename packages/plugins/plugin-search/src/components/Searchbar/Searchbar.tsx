//
// Copyright 2023 DXOS.org
//

import React, { type KeyboardEvent, useEffect, useRef, useState } from 'react';

import { Icon, Input, type TextInputProps } from '@dxos/react-ui';

export type SearchbarProps = Pick<TextInputProps, 'variant' | 'placeholder'> & {
  classes?: {
    root?: string;
    input?: string;
  };
  value?: string;
  onChange?: (text?: string) => void;
  onSubmit?: (text?: string) => void;
  delay?: number;
};

export const Searchbar = ({ classes, variant, placeholder, value, onChange, onSubmit }: SearchbarProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(value);
  useEffect(() => {
    setText(value);
  }, [value]);
  const handleChange = (text?: string) => {
    setText(text);
    onChange?.(text);
  };

  const handleReset = () => {
    handleChange(undefined);
    inputRef.current?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'Enter':
        onSubmit?.(text);
        break;
      case 'Escape':
        handleReset();
        break;
    }
  };

  return (
    <div className='flex shrink-0is-full items-center pli-1 pbs-1'>
      <Input.Root>
        <Input.TextInput
          ref={inputRef}
          placeholder={placeholder}
          variant={variant}
          value={text ?? ''}
          classNames={['pl-3 pr-10', classes?.input]}
          onChange={({ target }) => handleChange(target.value)}
          onKeyDown={handleKeyDown}
        />

        {/* TODO(burdon): Margin should be density specific. */}
        <div role='button' className='-ml-7 p-0 cursor-pointer' onClick={handleReset}>
          <Icon icon='ph--magnifying-glass--regular' size={5} />
        </div>
      </Input.Root>
    </div>
  );
};
