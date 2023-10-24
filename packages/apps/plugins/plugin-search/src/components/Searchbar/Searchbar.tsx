//
// Copyright 2023 DXOS.org
//

import { MagnifyingGlass } from '@phosphor-icons/react';
import React, { type FC, useEffect, useRef, useState } from 'react';

import { Button, Input, type TextInputProps } from '@dxos/react-ui';
import { getSize, inputSurface, mx } from '@dxos/react-ui-theme';

export type SearchbarProps = Pick<TextInputProps, 'variant' | 'placeholder'> & {
  className?: string;
  value?: string;
  onChange?: (text: string) => void;
  delay?: number;
};

export const Searchbar: FC<SearchbarProps> = ({ className, variant, placeholder, value, onChange }) => {
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
    <div className={mx('flex w-full items-center', inputSurface)}>
      <Input.Root>
        <Input.TextInput
          ref={inputRef}
          placeholder={placeholder}
          variant={variant}
          value={text}
          classNames={mx('pr-[40px]', className)}
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
