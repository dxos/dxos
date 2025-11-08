//
// Copyright 2023 DXOS.org
//

import React, { type FC, useEffect, useRef, useState } from 'react';

import { IconButton, Input, type TextInputProps } from '@dxos/react-ui';

export type SearchbarProps = Pick<TextInputProps, 'placeholder'> & {
  value?: string;
  onChange?: (text: string) => void;
  delay?: number;
};

export const Searchbar: FC<SearchbarProps> = ({ placeholder, value, onChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(value ?? '');
  useEffect(() => {
    setText(value ?? '');
  }, [value]);
  const handleChange = (text: string) => {
    setText(text);
    onChange?.(text);
  };

  const handleReset = () => {
    handleChange('');
    inputRef.current?.focus();
  };

  return (
    <div className='flex is-full items-center'>
      <Input.Root>
        <Input.TextInput
          ref={inputRef}
          placeholder={placeholder}
          value={text}
          onChange={({ target }) => handleChange(target.value)}
          onKeyDown={({ key }) => key === 'Escape' && handleReset()}
        />
        {/* TODO(burdon): Embedded icon. */}
        <IconButton icon='ph--x--regular' iconOnly label='Clear search' onClick={handleReset} variant='ghost' />
      </Input.Root>
    </div>
  );
};
