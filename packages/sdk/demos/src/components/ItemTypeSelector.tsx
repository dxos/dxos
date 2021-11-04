//
// Copyright 2020 DXOS.org
//

import { IconButton } from '@mui/material';
import React from 'react';

interface TypeMap {
  [key: string]: Function;
}

export const ItemTypeSelector = ({
  types,
  type,
  onChange
}: {
  types: TypeMap,
  type: string,
  onChange: (key: string) => void }
) => {
  return (
    <div>
      {Object.entries(types).map(([key, Icon]) => (
        <IconButton key={key} disabled={key === type} onClick={() => onChange(key)}>
          <Icon />
        </IconButton>
      ))}
    </div>
  );
};
