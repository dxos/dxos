//
// Copyright 2020 DXOS.org
//

import { Box, DialogTitle, SvgIconTypeMap, Toolbar, Typography } from '@mui/material';
import { OverridableComponent } from '@mui/material/OverridableComponent';
import React from 'react';

export const DialogHeading = ({
  title,
  icon: Icon
}: {
  title: string,
  icon?: OverridableComponent<SvgIconTypeMap<unknown, 'svg'>>
}) => {
  return (
    <DialogTitle>
      <Toolbar variant='dense' disableGutters>
        {Icon && (
          <Box sx={{ display: 'flex', marginRight: 1 }}>
            <Icon />
          </Box>
        )}
        <Typography variant='h5'>{title}</Typography>
      </Toolbar>
    </DialogTitle>
  );
};
