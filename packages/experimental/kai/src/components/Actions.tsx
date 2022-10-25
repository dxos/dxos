//
// Copyright 2022 DXOS.org
//

import React, { FC } from 'react';

import { SpeedDial, SpeedDialAction, SpeedDialIcon } from '@mui/material';

export const Actions: FC<{
  actions: any[];
}> = ({ actions }) => {
  return (
    <SpeedDial ariaLabel='Actions' sx={{ position: 'absolute', bottom: 16, right: 16 }} icon={<SpeedDialIcon />}>
      {actions.map((action) => (
        <SpeedDialAction key={action.name} icon={action.icon} tooltipTitle={action.name} />
      ))}
    </SpeedDial>
  );
};
