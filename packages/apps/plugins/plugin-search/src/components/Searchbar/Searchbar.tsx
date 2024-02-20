//
// Copyright 2023 DXOS.org
//

import { MagnifyingGlass } from '@phosphor-icons/react';
import React, { useEffect, useRef, useState } from 'react';

import { Input, type TextInputProps } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';

export type SearchbarProps = Pick<TextInputProps, 'variant' | 'placeholder'> & {
  classes?: {
    root?: string;
    input?: string;
  };
  value?: string;
  onChange?: (text?: string) => void;
  delay?: number;
};

export const Searchbar = ({ classes, variant, placeholder, value, onChange }: SearchbarProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState(value);
  useEffect(() => {
    setText(value);
  }, [value]);
  const handleChange = (text?: string) => {
    setText(text);
    onChange?.(text);
  };

  const handleReset = () => {
    handleChange(undefined);
    inputRef.current?.focus();
  };

  return (
    <div className='flex w-full items-center pli-1 pbs-1'>
      <Input.Root>
        <Input.TextInput
          ref={inputRef}
          placeholder={placeholder}
          variant={variant}
          value={text ?? ''}
          classNames={mx('pl-3 pr-10', classes?.input)}
          onChange={({ target }) => handleChange(target.value)}
          onKeyDown={({ key }) => key === 'Escape' && handleReset()}
        />

        {/* TODO(burdon): Margin should be density specific. */}
        <div role='button' className='-ml-7 p-0 cursor-pointer' onClick={handleReset}>
          <MagnifyingGlass className={getSize(5)} />
        </div>
      </Input.Root>
    </div>
  );
};
