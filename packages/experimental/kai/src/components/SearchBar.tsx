//
// Copyright 2023 DXOS.org
//

import { MagnifyingGlass } from 'phosphor-react';
import React, { FC, useState } from 'react';

import { Input } from './Input';

/**
 * Search bar.
 */
export const SearchBar: FC<{
  onSearch?: (text: string) => void;
}> = ({ onSearch }) => {
  const [text, setText] = useState('');

  return (
    <div className='flex flex-col'>
      <div className='flex flex-1 items-center p-2 border-2 rounded'>
        <Input
          className='w-full outline-0'
          spellCheck={false}
          value={text}
          onChange={setText}
          placeholder='Search...'
        />

        <button className='p-1' onClick={() => onSearch?.(text)}>
          <MagnifyingGlass />
        </button>
      </div>
    </div>
  );
};
