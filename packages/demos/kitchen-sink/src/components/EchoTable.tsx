//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { Item } from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';

import { Box } from '@mui/material';

export interface EchoTableProps {
  items?: Item<ObjectModel>[]
}

export const EchoTable = ({
  items = []
}: EchoTableProps) => {
  return (
    <Box sx={{
      display: 'flex',
      flex: 1
    }}>

    </Box>
  );
};
