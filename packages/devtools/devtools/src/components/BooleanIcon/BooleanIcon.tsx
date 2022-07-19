//
// Copyright 2021 DXOS.org
//

import React from 'react';

import {
  CheckCircleOutline as TrueIcon,
  RadioButtonUnchecked as FalseIcon
} from '@mui/icons-material';
import { IconButton, colors } from '@mui/material';

export const BooleanIcon = ({ value }: { value: boolean | undefined }) => (
  <IconButton size='small' disabled={true}>
    {value
      ? <TrueIcon style={{ color: colors.green[500] }} />
      : <FalseIcon style={{ color: value === false ? colors.red[500] : 'transparent' }} />
    }
  </IconButton>
);
