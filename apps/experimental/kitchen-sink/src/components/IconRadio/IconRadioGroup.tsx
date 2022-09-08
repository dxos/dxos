//
// Copyright 2022 DXOS.org
//

import React, { ReactNode, createContext } from 'react';

import { Box } from '@mui/material';

interface IconRadioGroupContextProps {
  value: string
  onChange: (value: string) => void
}

export const IconRadioGroupContext = createContext<IconRadioGroupContextProps | undefined>(undefined);

interface IconRadioGroupProps {
  children: ReactNode
  value: string
  onChange: (value: string) => void
}

export const IconRadioGroup = ({
  children,
  value,
  onChange
}: IconRadioGroupProps) => (
  <Box>
    <IconRadioGroupContext.Provider value={{ value, onChange }}>
      {children}
    </IconRadioGroupContext.Provider>
  </Box>
);
