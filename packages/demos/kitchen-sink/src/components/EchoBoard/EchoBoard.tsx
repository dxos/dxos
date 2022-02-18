//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { Grid } from '@mui/material';

import { Item } from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';

import { EchoCard } from './EchoCard';

export interface EchoBoardProps {
  items?: Item<ObjectModel>[]
  labelProperty?: string
}

export const EchoBoard = ({
  items = [],
  labelProperty = 'title' // TODO(burdon): Convert to adapter.
}: EchoBoardProps) => {
  const items2 = items.length > 4 ? [items[1], items[2], items[3], items[4]] : [];

  // TODO(burdon): Scroll.
  return (
    <Grid
      container
      sx={{
        display: 'flex',
        padding: 1
      }}
    >
      {items2.map(item => (
        <Grid
          key={item.id}
          item
          spacing={2}
        >
          <EchoCard
            item={item}
            labelProperty={labelProperty}
          >
          </EchoCard>
        </Grid>
      ))}
    </Grid>
  );
};
