//
// Copyright 2020 DXOS.org
//

import { DialogTitle, styled, SvgIconTypeMap, Toolbar, Typography } from '@mui/material';
import { OverridableComponent } from '@mui/material/OverridableComponent';
import React from 'react';

const Title = styled(Typography)(({ theme }) => ({
  marginLeft: theme.spacing(2)
}));

const DialogHeading = ({
  title,
  icon: Icon
}: {
  title: string,
  icon: OverridableComponent<SvgIconTypeMap<unknown, 'svg'>>
}) => {
  return (
    <DialogTitle>
      <Toolbar variant="dense" disableGutters>
        <Icon />
        <Title variant="h5">{title}</Title>
      </Toolbar>
    </DialogTitle>
  );
};

export default DialogHeading;
