//
// Copyright 2022 DXOS.org
//

import React, { ReactNode } from 'react';

import { Card, CardContent, CardHeader } from '@mui/material';

import { Item } from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';

import { ItemAdapter } from '../adapter';

export interface EchoCardProps {
  item: Item<ObjectModel>
  itemAdapter: ItemAdapter
  children?: ReactNode | ReactNode[]
}

export const EchoCard = ({
  item,
  itemAdapter,
  children
}: EchoCardProps) => {
  const { label, icon: Icon, color } = itemAdapter.meta?.(item.type!) ?? {};

  return (
    <Card sx={{
      width: 300,
      margin: 1
    }}>
      <CardHeader
        sx={{
          backgroundColor: color?.[50],
          '.MuiCardHeader-content': {
            overflow: 'hidden'
          }
        }}
        avatar={Icon && <Icon />}
        title={itemAdapter.title(item)}
        titleTypographyProps={{
          variant: 'h6',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis'
        }}
        subheader={label}
      />

      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
};
