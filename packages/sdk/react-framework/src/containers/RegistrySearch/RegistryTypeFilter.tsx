//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { styled, Chip } from '@mui/material';

import { CID, RegistryTypeRecord } from '@dxos/registry-client';

// Consider: https://mui.com/components/autocomplete/#multiple-values

// https://mui.com/components/chips/#chip-array
const List = styled('ul')(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  flexWrap: 'wrap',
  listStyle: 'none',
  padding: theme.spacing(0.5),
  margin: 0
}));

const ListItem = styled('li')(({ theme }) => ({
  margin: theme.spacing(0.5)
}));

export const typeName = (type: RegistryTypeRecord) => {
  const parts = type.messageName.split('.');
  return parts[parts.length - 1];
}

export interface RegistryTypeFilterProps {
  types: RegistryTypeRecord[]
  selected?: CID[]
  onSelectedChange: (selected: CID[]) => void
}

/**
 * List of selectable types.
 */
export const RegistryTypeFilter = ({
  types,
  selected = [],
  onSelectedChange
}: RegistryTypeFilterProps) => {
  return (
    <List>
      {types.map(type => (
        <ListItem key={type.messageName}>
          <Chip
            label={typeName(type)}
            size='small'
            color={selected?.includes(type.cid) ? 'primary' : undefined}
            onClick={() => {
              onSelectedChange(selected?.includes(type.cid) ?
                selected?.filter(t => t !== type.cid) : [...selected, type.cid]);
            }}
          />
        </ListItem>
      ))}
    </List>
  );
};
