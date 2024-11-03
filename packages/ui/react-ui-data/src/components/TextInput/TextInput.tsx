//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import { Input, type TextInputProps as NativeTextInputProps } from '@dxos/react-ui';

export type TextInputProps = {
  // format?: PatternAnnotation;
} & Omit<NativeTextInputProps, 'style'>;

/**
 * @deprecated
 * Remove.
 */
export const TextInput = ({ onChange, ...props }: TextInputProps) => {
  const [valid, setValid] = useState(true);

  const handleChange: NativeTextInputProps['onChange'] = (ev) => {
    // const text = ev.target.value;
    // if (!format?.filter || text.match(format.filter)) {
    onChange?.(ev);
    //   if (format?.valid) {
    //     setValid(format.valid.test(text));
    //   }
    // }
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
