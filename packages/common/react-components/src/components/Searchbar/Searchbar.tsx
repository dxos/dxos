//
// Copyright 2023 DXOS.org
//

import { MagnifyingGlass } from 'phosphor-react';
import React, { FC, useState } from 'react';

import { mx } from '../../util';
import { Input } from '../Input';

/**
 * Search bar.
 */
export const Searchbar: FC<{
  border?: boolean;
  onSearch?: (text: string) => void;
}> = ({ border = true, onSearch }) => {
  const [text, setText] = useState('');
  const handleChange = (text: string) => {
    setText(text);
    onSearch?.(text);
  };

  return (
    <div className='flex flex-1 flex-col bg-white'>
      <div className={mx('flex flex-1 items-center p-2', border && 'border rounded')}>
        <Input
          label={undefined}
          onChange={(event) => handleChange(event.target.value)}
          placeholder='Search...'
          slots={{
            input: {
              spellCheck: false
            }
          }}
        />
        <button className='p-1' onClick={() => onSearch?.(text)}>
          <MagnifyingGlass />
        </button>
      </div>
    </div>
  );
};
