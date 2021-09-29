//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { createTheme, DialogTitle, SvgIconTypeMap, Toolbar, Typography } from '@mui/material';
import { OverridableComponent } from '@mui/material/OverridableComponent';
import { makeStyles } from '@mui/styles';

const useStyles = makeStyles((theme) => ({
  title: {
    marginLeft: theme.spacing(2)
  }
}), { defaultTheme: createTheme({}) });

const DialogHeading = ({
  title,
  icon: Icon
}: {
  title: string,
  icon: OverridableComponent<SvgIconTypeMap<unknown, 'svg'>>
}) => {
  const classes = useStyles();
  return (
    <DialogTitle>
      <Toolbar variant='dense' disableGutters>
        <Icon />
        <Typography variant='h5' className={classes.title}>{title}</Typography>
      </Toolbar>
    </DialogTitle>
  );
};

export default DialogHeading;
