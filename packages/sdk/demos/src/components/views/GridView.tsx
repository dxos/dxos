//
// Copyright 2020 DXOS.org
//

import { Box, createTheme, Typography } from '@mui/material';
import { teal } from '@mui/material/colors';
import { makeStyles } from '@mui/styles';
import React from 'react';

import { ItemAdapter } from './adapter';

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex',
    flexWrap: 'wrap',
    alignContent: 'flex-start'
  },
  card: {
    width: 240,
    height: 240,
    overflow: 'hidden',
    backgroundColor: teal[50],
    margin: 2,
    padding: theme.spacing(1),
    '& h6': {
      lineHeight: 1.2,
      marginBottom: theme.spacing(1)
    }
  }
}), { defaultTheme: createTheme({}) });

export interface GridViewProps {
  adapter: ItemAdapter
  items: any[]
}

const GridView = ({ adapter, items = [] }: GridViewProps) => {
  const classes = useStyles();

  return (
    <Box className={classes.root}>
      {items.map((item) => {
        const title = adapter.primary(item);
        const description = adapter.secondary?.(item);

        return (
          <Box key={item.id} className={classes.card}>
            <Typography variant="h6">{title}</Typography>
            <Typography variant="body2">{description}</Typography>
          </Box>
        );
      })}
    </Box>
  );
};

export default GridView;
