//
// Copyright 2023 DXOS.org
//

import { MagnifyingGlass } from 'phosphor-react';
import React, { FC, useState } from 'react';

import { Input } from '../Input';

export type SearchbarProps = {
  disabled?: boolean;
  onSearch?: (text: string) => void;
};

export const Searchbar: FC<SearchbarProps> = ({ disabled, onSearch }) => {
  const [text, setText] = useState('');
  const handleChange = (text: string) => {
    setText(text);
    onSearch?.(text);
  };

  return (
    <div className='flex flex-1 flex-col'>
      <div className='flex flex-1 items-center'>
        <Input
          label={'Search'}
          onChange={(event) => handleChange(event.target.value)}
          placeholder='Search...'
          disabled={disabled}
          slots={{
            root: {
              className: 'flex flex-1 mlb-0 border-t rounded'
            },
            label: { className: 'sr-only' },
            input: {
              spellCheck: false,
              className: 'w-full'
            }
          }}
        />

        {/* TODO(burdon): Move decorator inside input. */}
        <button className='p-1' onClick={() => onSearch?.(text)}>
          <MagnifyingGlass />
        </button>
      </div>
    </div>
  );
};
