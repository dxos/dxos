//
// Copyright 2022 DXOS.org
//

import { css } from '@emotion/css';
import React, { FC } from 'react';

import {
  Card,
  CardActions,
  CardContent,
  Button,
  Typography
} from '@mui/material';

import type { Item, ObjectModel } from '@dxos/client';

const styles = css`
  &.MuiCard-root {
    margin: 16px
  }
`;

export const DiaryEntry: FC<{
  item: Item<ObjectModel>
}> = ({ item }) => {
  return (
    <Card
      className={styles}
      variant='outlined'
    >
      <CardContent>
        <Typography sx={{ fontSize: 14 }} color='text.secondary' gutterBottom>
          {item.id}
        </Typography>
        <Typography variant='h5' component='div'>
          {item.model.get('title') ?? ''}
        </Typography>
        <Typography sx={{ mb: 1.5 }} color='text.secondary'>
          {item.model.get('date')}
        </Typography>
        <Typography variant='body2'>
          {item.model.get('content')}
        </Typography>
      </CardContent>
      <CardActions>
        <Button size='small'>Learn More</Button>
      </CardActions>
    </Card>
  );
};
