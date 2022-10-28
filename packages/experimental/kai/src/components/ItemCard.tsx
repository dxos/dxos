//
// Copyright 2022 DXOS.org
//

import { css } from '@emotion/css';
import React, { FC } from 'react';

import { Card, CardActions, CardContent, Button, Typography } from '@mui/material';

import { Item } from '../hooks';

const styles = css`
  &.MuiCard-root {
    margin: 16px;
  }
`;

export const ItemCard: FC<{
  item: Item;
}> = ({ item }) => {
  return (
    <Card className={styles} variant='outlined'>
      <CardContent>
        <Typography sx={{ fontSize: 14 }} color='text.secondary' gutterBottom>
          {item.id}
        </Typography>
        <Typography variant='h5' component='div'>
          {item.title}
        </Typography>
        <Typography sx={{ mb: 1.5 }} color='text.secondary'>
          {item.type}
        </Typography>
        <Typography variant='body2'>{item.description}</Typography>
      </CardContent>
      <CardActions>
        <Button size='small'>Learn More</Button>
      </CardActions>
    </Card>
  );
};
