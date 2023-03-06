//
// Copyright 2023 DXOS.org
//

import { MagnifyingGlass } from 'phosphor-react';
import React, { FC, useState } from 'react';

import { Input } from '../Input';

type SearchbarSlots = {
  input?: {
    className?: string;
    autoFocus?: boolean;
  };
};

export type SearchbarProps = {
  disabled?: boolean;
  slots?: SearchbarSlots;
  onSearch?: (text: string) => void;
};

export const Searchbar: FC<SearchbarProps> = ({ disabled, slots = {}, onSearch }) => {
  const [text, setText] = useState('');
  const handleChange = (text: string) => {
    setText(text);
    onSearch?.(text);
  };

  return (
    <div className='flex flex-1 flex-col'>
      <div className='flex flex-1 items-center'>
        <Input
          variant='subdued'
          label='Search'
          labelVisuallyHidden
          placeholder='Search...'
          disabled={disabled}
          slots={{
            root: {
              className: 'flex flex-1'
            },
            input: {
              spellCheck: false,
              ...slots.input
            }
          }}
          onChange={(event) => handleChange(event.target.value)}
        />

        {/* TODO(burdon): Move decorator inside input. */}
        <button className='p-1' onClick={() => onSearch?.(text)}>
          <MagnifyingGlass />
        </button>
      </div>
    </div>
  );
};
