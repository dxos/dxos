//
// Copyright 2025 DXOS.org
//

import { Text, useInput } from 'ink';
import type { ComponentProps } from 'react';
import React from 'react';

export type InputProps = {
  value: string;
  onChange: (value: string) => void;
} & ComponentProps<typeof Text>;

export const Input = ({ value, onChange, ...rest }: InputProps) => {
  useInput((input, key) => {
    if (key.backspace || key.delete) {
      onChange(value.slice(0, -1));
    } else if (key.return || key.ctrl) {
    } else {
      onChange(value + input);
    }
  });

  return <Text {...rest}>{value}</Text>;
};
