//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Input, type TextInputProps, useControlledState } from '@dxos/react-ui';

export type SearchbarProps = Pick<TextInputProps, 'placeholder'> & {
  delay?: number;
  value?: string;
  onChange?: (text: string) => void;
};

export const Searchbar = ({ placeholder, value, onChange }: SearchbarProps) => {
  const [text, setText] = useControlledState(value ?? '', onChange);

  return (
    <div role='none' className='flex is-full items-center'>
      <Input.Root>
        <Input.TextInput placeholder={placeholder} value={text} onChange={({ target }) => setText(target.value)} />
      </Input.Root>
    </div>
  );
};
