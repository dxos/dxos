//
// Copyright 2022 DXOS.org
//

import React, { ReactNode } from 'react';

import { Card, CardContent, CardHeader } from '@mui/material';

import { Item } from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';
import { ItemAdapter } from '@dxos/react-client-testing';

export interface EchoCardProps {
  item: Item<ObjectModel>;
  itemAdapter: ItemAdapter;
  children?: ReactNode;
}

export const EchoCard = ({ item, itemAdapter, children }: EchoCardProps) => {
  const { icon: Icon, color } = itemAdapter.meta?.(item.type!) ?? {};

  return (
    <Card
      sx={{
        width: 280,
        margin: 1
      }}
    >
      <CardHeader
        sx={{
          alignItems: 'start',
          backgroundColor: color?.[50],
          '.MuiCardHeader-avatar': {
            paddingTop: '5px'
          },
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
        subheader={itemAdapter.description(item)}
      />

      <CardContent>{children}</CardContent>
    </Card>
  );
};
