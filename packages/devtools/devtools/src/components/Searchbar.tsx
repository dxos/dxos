//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Field, type InputProps, useControlledState } from '@dxos/react-ui';

export type SearchbarProps = Pick<InputProps, 'placeholder'> & {
  delay?: number;
  value?: string;
  onChange?: (text: string) => void;
};

export const Searchbar = ({ placeholder, value, onChange }: SearchbarProps) => {
  const [text, setText] = useControlledState(value ?? '', onChange);

  return (
    <div className='flex w-full items-center'>
      <Field.Root>
        <Field.Input placeholder={placeholder} value={text} onChange={({ target }) => setText(target.value)} />
      </Field.Root>
    </div>
  );
};
