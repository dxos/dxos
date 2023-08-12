//
// Copyright 2023 DXOS.org
//

import { X } from '@phosphor-icons/react';
import React, { FC, useRef, useState } from 'react';

import { Button, Input } from '@dxos/aurora';

export type SearchbarProps = {
  onSearch?: (text: string) => void;
};

export const Searchbar: FC<SearchbarProps> = ({ onSearch }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const handleChange = (text: string) => {
    setText(text);
    onSearch?.(text);
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
          placeholder={'Search...'}
          value={text}
          onChange={({ target }) => handleChange(target.value)}
          onKeyDown={({ key }) => key === 'Escape' && handleReset()}
        />
      </Input.Root>
      <Button onClick={handleReset}>
        <X />
      </Button>
    </div>
  );
};
