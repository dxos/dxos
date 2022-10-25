//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { Box, Grid } from '@mui/material';

import { Item } from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';
import { ItemID } from '@dxos/protocols';
import { ItemAdapter } from '@dxos/react-client-testing';

import { EchoCard } from './EchoCard';
import { EchoSubList } from './EchoSubList';

export interface EchoBoardProps {
  items?: Item<ObjectModel>[];
  itemAdapter: ItemAdapter;
  onCreateItem?: (type: string, title: string, parent?: ItemID) => void;
}

export const EchoBoard = ({
  items = [],
  itemAdapter,
  onCreateItem
}: EchoBoardProps) => (
  <Grid
    container
    spacing={2}
    sx={{
      display: 'flex',
      padding: 1,
      overflow: 'scroll',
      justifyContent: 'center'
    }}
  >
    {items
      .map((item) => {
        const { childTypes } = itemAdapter.meta?.(item.type!) ?? {};
        if (!childTypes) {
          return undefined;
        }

        return (
          <Grid key={item.id} item>
            <EchoCard item={item} itemAdapter={itemAdapter}>
              {childTypes!.map((type) => (
                <Box key={type} sx={{ paddingBottom: 0.5 }}>
                  <EchoSubList
                    item={item}
                    itemAdapter={itemAdapter}
                    type={type}
                    onCreateItem={onCreateItem}
                  />
                </Box>
              ))}
            </EchoCard>
          </Grid>
        );
      })
      .filter(Boolean)}
  </Grid>
);
