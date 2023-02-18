//
// Copyright 2022 DXOS.org
//

import React, { ReactNode, useContext } from 'react';

import { IconButton, IconButtonProps } from '@mui/material';

import { IconRadioGroupContext } from './IconRadioGroup';

interface IconRadioProps extends IconButtonProps {
  children: ReactNode;
  value: string;
}

export const IconRadio = ({ children, value, ...rest }: IconRadioProps) => {
  const { value: current, onChange } = useContext(IconRadioGroupContext)!;

  return (
    <IconButton onClick={() => onChange(value)} color={value === current ? 'primary' : undefined} {...rest}>
      {children}
    </IconButton>
  );
};
