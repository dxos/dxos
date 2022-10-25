//
// Copyright 2021 DXOS.org
//

import React from 'react';

import { styled, Chip } from '@mui/material';

import { useControlledState } from '@dxos/react-async';
import { CID, RegistryType } from '@dxos/registry-client';

import { getTypeName } from './RegistrySearchModel';

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

export interface RegistryTypeFilterProps {
  types: RegistryType[];
  selected?: CID[];
  onSelectedChange: (selected: CID[]) => void;
}

/**
 * List of selectable types.
 */
export const RegistryTypeFilter = ({
  types,
  selected: controlledSelected = [],
  onSelectedChange
}: RegistryTypeFilterProps) => {
  const [selected, setSelected] = useControlledState<CID[]>(
    controlledSelected,
    onSelectedChange
  );

  return (
    <List>
      {types.map((type) => (
        <ListItem key={type.type.messageName}>
          <Chip
            label={getTypeName(type)}
            size='small'
            color={selected?.includes(type.cid) ? 'primary' : undefined}
            onClick={() => {
              const on = selected?.includes(type.cid);
              setSelected(
                on
                  ? selected?.filter((t: CID) => t !== type.cid)
                  : [...selected, type.cid]
              );
            }}
          />
        </ListItem>
      ))}
    </List>
  );
};
