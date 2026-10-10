//
// Copyright 2023 DXOS.org
//

import React from 'react';

import * as Field from '@dxos/react-ui/Field';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Input from '@dxos/react-ui/Input';

export type SearchbarProps = Pick<Input.RootProps, 'placeholder'> & {
  delay?: number;
  value?: string;
  onChange?: (text: string) => void;
};

export const Searchbar = ({ placeholder, value, onChange }: SearchbarProps) => {
  const [text, setText] = Hooks.useControlledState(value ?? '', onChange);

  return (
    <div className='flex w-full items-center'>
      <Field.Root>
        <Input.Root placeholder={placeholder} value={text} onChange={({ target }) => setText(target.value)} />
      </Field.Root>
    </div>
  );
};
