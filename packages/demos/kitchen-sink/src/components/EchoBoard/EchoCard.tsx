//
// Copyright 2022 DXOS.org
//

import React, { ReactNode } from 'react';

import { Button, Card, CardActions, CardContent, CardHeader } from '@mui/material';

import { Item } from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';

import { Icon } from '../Icon';

export interface EchoCardProps {
  item: Item<ObjectModel>
  labelProperty: string
  children?: ReactNode | ReactNode[]
}

export const EchoCard = ({
  item,
  labelProperty = 'title',
  children
}: EchoCardProps) => {
  return (
    <Card sx={{
      width: 350,
      margin: 1
    }}>
      <CardHeader
        sx={{
          '.MuiCardHeader-content': {
            overflow: 'hidden'
          }
        }}
        avatar={<Icon type={item.type} />}
        title={item.model.getProperty(labelProperty)}
        titleTypographyProps={{
          variant: 'h5',
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          textOverflow: 'ellipsis'
        }}
        subheader={item.type}
      />

      <CardContent>
        {children}
      </CardContent>

      <CardActions>
        <Button>OK</Button>
      </CardActions>
    </Card>
  );
};
