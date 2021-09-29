//
// Copyright 2021 DXOS.org
//

import React from 'react';

import green from '@material-ui/core/colors/green';
import red from '@material-ui/core/colors/red';
import YesIcon from '@material-ui/icons/CheckCircleOutline';
import NoIcon from '@material-ui/icons/RadioButtonUnchecked';

const BooleanIcon = ({ yes = false, error = false }) => {
  return (yes
    ? <YesIcon style={{ color: green[500] }} />
    : <NoIcon style={{ color: error ? red[500] : 'transparent' }} />
  );
};

export default BooleanIcon;
