//
// Copyright 2023 DXOS.org
//

import { X } from '@phosphor-icons/react';
import React, { type FC, useEffect, useRef, useState } from 'react';

import { Button, Input, type TextInputProps } from '@dxos/aurora';

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
    <div className='flex w-full items-center'>
      <Input.Root>
        <Input.TextInput
          ref={inputRef}
          placeholder={placeholder}
          value={text}
          onChange={({ target }) => handleChange(target.value)}
          onKeyDown={({ key }) => key === 'Escape' && handleReset()}
        />
        {/* TODO(burdon): Embedded icon. */}
        <Button variant='ghost' classNames='bg-red-100' onClick={handleReset}>
          <X />
        </Button>
      </Input.Root>
    </div>
  );
};
