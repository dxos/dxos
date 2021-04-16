//
// Copyright 2020 DXOS.org
//

import React from 'react';
import {
  Button,
  Card,
  CardActions,
  CardContent,
  CardHeader,
  Grid,
  Typography,
} from '@material-ui/core';
import { grey } from '@material-ui/core/colors';
import { makeStyles } from '@material-ui/core/styles';

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

export interface CardAdapter {
  key: (any) => string
  primary: (any) => string
  secondary: (any) => string
  icon?: (any) => any // TODO(burdon): Type.
  slices: (any) => any[] | void
}

export const ItemCard = ({ adapter, item }: { adapter: CardAdapter, item: any }) => {
  const classes = useStyles();

  const title = adapter.primary(item);
  const description = adapter.secondary(item);
  const slices = adapter.slices(item);

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
          <Typography component="p" className={classes.description}>
            {description}
          </Typography>
        )}
        {slices && slices.map((slice, i) => (
          <div key={i}>{slice}</div>
        ))}
      </CardContent>
      <CardActions>
        <Button size="small" color="primary">
          Info
        </Button>
      </CardActions>
    </Card>
  );
};

export interface CardViewProps {
  adapter: CardAdapter
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
