//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { useClient, useParties, useSelection } from '@dxos/react-client';
import { JsonTreeView } from '@dxos/react-components';
import TreeView from '@mui/lab/TreeView';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TreeItem from '@mui/lab/TreeItem';
import { useStream } from '../hooks';
import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import { PartyProxy } from '@dxos/client';
import { Item } from '@dxos/echo-db';

export const ItemsViewer = () => {
  const [selectedParty, setSelectedParty] = useState<PartyProxy | undefined>()

  const items = useSelection(
    selectedParty?.database.select(s => s
      .filter(item => !item.parent)
      .items as Item<any>[]),
   [selectedParty]) ?? [];

  return (
    <>
      <PartySelect value={selectedParty} onChange={setSelectedParty} />
      <TreeView
        aria-label="file system navigator"
        defaultCollapseIcon={<ExpandMoreIcon />}
        defaultExpandIcon={<ChevronRightIcon />}
        sx={{ height: 240, flexGrow: 1, maxWidth: 400, overflowY: 'auto' }}
      >
        {items.map(item => <ItemNode key={item.id} item={item} />)}
      </TreeView>
    </>
  );
};

interface PartySelectProps {
  value: PartyProxy | undefined;
  onChange: (newValue: PartyProxy | undefined) => void;
}

const PartySelect = ({ value, onChange }: PartySelectProps) => {
  const parties = useParties();

  return (
    <FormControl fullWidth>
      <InputLabel id='party-select'>Party</InputLabel>
      <Select
        id='party-select'
        label='Party'
        variant='standard'
        value={value?.key.toHex()}
        onChange={(event) => onChange(parties.find(p => p.key.equals(event.target.value)))}
      >
        {parties.map((party) => (
          <MenuItem key={party.key.toHex()} value={party.key.toHex()}>
            {party.key.toHex()}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

interface ItemNodeProps {
  item: Item<any>
}

const ItemNode = ({ item }: ItemNodeProps) => {
  const children = useSelection(item.select(s => s.children().items as Item<any>[]), [item]) ?? [];

  return (
    <TreeItem nodeId={item.id} label={item.type}>
      {children.map((child) => (
        <ItemNode key={child.id} item={child} />
      ))}
    </TreeItem>
  );
}
