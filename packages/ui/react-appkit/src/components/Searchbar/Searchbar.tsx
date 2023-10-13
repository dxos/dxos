//
// Copyright 2023 DXOS.org
//

import { X } from '@phosphor-icons/react';
import React, { type FC, useState } from 'react';

import { mx } from '@dxos/aurora-theme';

import { Input, type InputProps } from '../Input';

// TODO(burdon): Differentiate slots applied to Input vs slots spread into Input slots?
type SearchbarSlots = {
  root?: {
    className?: string;
    placeholder?: string;
    variant?: InputProps['variant'];
  };
  input?: {
    className?: string;
    autoFocus?: boolean;
  };
  button?: {
    className?: string;
  };
};

export type SearchbarProps = {
  slots?: SearchbarSlots;
  onSearch?: (text: string) => void;
};

export const Searchbar: FC<SearchbarProps> = ({ slots = {}, onSearch }) => {
  const [text, setText] = useState('');
  const handleChange = (text: string) => {
    setText(text);
    onSearch?.(text);
  };

  const handleReset = () => {
    handleChange('');
  };

  return (
    <div className={mx('flex w-full items-center', slots.root?.className)}>
      <Input
        label='Search'
        labelVisuallyHidden
        placeholder={slots.root?.placeholder ?? 'Search...'}
        variant={slots.root?.variant ?? 'default'}
        slots={{
          root: {
            className: 'flex w-full',
          },
          input: {
            onKeyDown: ({ key }) => key === 'Escape' && handleReset(),
            spellCheck: false,
            ...slots.input,
          },
        }}
        value={text}
        onChange={({ target }) => handleChange(target.value)}
      />

      {/* TODO(burdon): Place inside input? */}
      <button className={mx('p-1', slots.button?.className)} onClick={handleReset}>
        <X />
      </button>
    </div>
  );
};
