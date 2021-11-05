//
// Copyright 2021 DXOS.org
//

import React from 'react';

import {
  CheckCircleOutline as YesIcon,
  RadioButtonUnchecked as NoIcon
} from '@mui/icons-material';
import { colors } from '@mui/material';

/**
 * @deprecated Move out of framework (not too app-specific).
 */
export const BooleanIcon = ({ yes = false, error = false }) => {
  return (yes
    ? <YesIcon style={{ color: colors.green[500] }} />
    : <NoIcon style={{ color: error ? colors.red[500] : 'transparent' }} />
  );
};
