//
// Copyright 2021 DXOS.org
//

import YesIcon from '@mui/icons-material/CheckCircleOutline';
import NoIcon from '@mui/icons-material/RadioButtonUnchecked';
import green from '@mui/material/colors/green';
import red from '@mui/material/colors/red';
import React from 'react';

const BooleanIcon = ({ yes = false, error = false }) => {
  return (yes
    ? <YesIcon style={{ color: green[500] }} />
    : <NoIcon style={{ color: error ? red[500] : 'transparent' }} />
  );
};

export default BooleanIcon;
