//
// Copyright 2020 DXOS.org
//

import {
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Grid,
  Typography
} from '@mui/material';
import { grey } from '@mui/material/colors';
import { makeStyles } from '@mui/styles';
import React from 'react';

import { ItemAdapter } from './adapter';

const useStyles = makeStyles(() => ({
  root: {
    display: 'flex'
  },
  card: {
    width: 280
  },
  cardContent: {
    paddingBottom: 0
  },
  header: {
    backgroundColor: grey[200]
  },
  description: {
    maxHeight: 72
  },
  nowrap: {
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis'
  }
}));

export const ItemCard = ({ adapter, item }: { adapter: ItemAdapter, item: any }) => {
  const classes = useStyles();

  const title = adapter.primary(item);
  const description = adapter.secondary?.(item);

  // Type-specific content.
  const slices = adapter.slices && adapter?.slices(item);

  // Type-specific actions.
  const actions = adapter.actions ? adapter.actions(item) : [];

  return (
    <Card classes={{ root: classes.card }}>
      <CardHeader
        classes={{ root: classes.header, content: classes.nowrap, title: classes.nowrap }}
        avatar={adapter.icon && <adapter.icon item={item} />}
        title={title}
        titleTypographyProps={{ variant: 'h6' }}
      />
      <CardContent classes={{ root: classes.cardContent }}>
        {description && (
          <Typography component='p' className={classes.description}>
            {description}
          </Typography>
        )}
        {slices && slices.map((slice, i) => (
          <div key={i}>{slice}</div>
        ))}
      </CardContent>
      <CardActions>
        {actions}
      </CardActions>
    </Card>
  );
};

export interface CardViewProps {
  adapter: ItemAdapter
  items: any[]
}

const CardView = ({ adapter, items = [] }: CardViewProps) => {
  const classes = useStyles();

  return (
    <Grid container spacing={2} className={classes.root}>
      {items.map((item) => {
        return (
          <Grid item key={adapter.key(item)}>
            <ItemCard adapter={adapter} item={item} />
          </Grid>
        );
      })}
    </Grid>
  );
};

export default CardView;
