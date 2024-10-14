//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import { Input, type TextInputProps as NativeTextInputProps } from '@dxos/react-ui';

import { type FormatAnnotation } from '../../types';

export type TextInputProps = {
  format?: FormatAnnotation;
} & Omit<NativeTextInputProps, 'style'>;

// TODO(burdon): Move to react-ui.
export const TextInput = ({ format, onChange, ...props }: TextInputProps) => {
  const [valid, setValid] = useState(true);

  const handleChange: NativeTextInputProps['onChange'] = (ev) => {
    const text = ev.target.value;
    if (!format?.filter || text.match(format.filter)) {
      onChange?.(ev);
      if (format?.valid) {
        setValid(format.valid.test(text));
      }
    }
  };

  return (
    <Input.TextInput
      {...props}
      // TODO(burdon): validationValence on Input.
      style={valid ? {} : ({ '--tw-ring-color': 'red' } as any)}
      onChange={handleChange}
    />
  );
};
