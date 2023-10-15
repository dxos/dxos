//
// Copyright 2023 DXOS.org
//

import { MagnifyingGlass } from '@phosphor-icons/react';
import React, { type FC, useEffect, useRef, useState } from 'react';

import { Button, Input, type TextInputProps } from '@dxos/aurora';
import { getSize } from '@dxos/aurora-theme';

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
          classNames='pr-[40px]'
          onChange={({ target }) => handleChange(target.value)}
          onKeyDown={({ key }) => key === 'Escape' && handleReset()}
        />

        <Button variant='ghost' classNames='-ml-8 p-0 cursor-pointer' onClick={handleReset}>
          <MagnifyingGlass className={getSize(5)} />
        </Button>
      </Input.Root>
    </div>
  );
};
