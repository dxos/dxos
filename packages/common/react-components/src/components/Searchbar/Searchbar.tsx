//
// Copyright 2023 DXOS.org
//

import { MagnifyingGlass } from 'phosphor-react';
import React, { FC, useState } from 'react';

import { mx } from '../../util';
import { Input } from '../Input';

export type SearchbarSlots = {
  input: {
    className?: string;
    variant?: string;
  };
};

export type SearchbarProps = {
  disabled?: boolean;
  slots?: SearchbarSlots;
  onSearch?: (text: string) => void;
};

/**
 * Search bar.
 */
export const Searchbar: FC<SearchbarProps> = ({ disabled, slots, onSearch }) => {
  const [text, setText] = useState('');
  const handleChange = (text: string) => {
    setText(text);
    onSearch?.(text);
  };

  console.log(slots);

  return (
    <div className='flex flex-1 flex-col'>
      <div className={mx('flex flex-1 items-center')}>
        <Input
          label={'Search'}
          onChange={(event) => handleChange(event.target.value)}
          placeholder='Search...'
          disabled={disabled}
          slots={{
            root: {
              className: 'flex flex-1 mlb-0'
            },
            label: { className: 'sr-only' },
            input: {
              className: mx('flex flex-1', slots?.input?.className),
              spellCheck: false,
              ...slots?.input
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
