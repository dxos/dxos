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
import { Box, FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import { PartyProxy } from '@dxos/client';
import { Item } from '@dxos/echo-db';
import { Model } from '@dxos/model-factory';
import { ObjectModel } from '@dxos/object-model';

export const ItemsViewer = () => {
  const [selectedParty, setSelectedParty] = useState<PartyProxy | undefined>()

  const items = useSelection(
    selectedParty?.database.select(s => s
      .filter(item => !item.parent)
      .items as Item<any>[]),
   [selectedParty]) ?? [];

  const [selectedItem, setSelectedItem] = useState<Item<any> | undefined>();

  return (
    <>
      <PartySelect value={selectedParty} onChange={setSelectedParty} />
      <Box flexDirection='row' display='flex'>
        <Box flex={1}>
          <TreeView
            defaultCollapseIcon={<ExpandMoreIcon />}
            defaultExpandIcon={<ChevronRightIcon />}
            sx={{ height: 240, flexGrow: 1, maxWidth: 400, overflowY: 'auto' }}
          >
            {items.map(item => <ItemNode key={item.id} item={item} onSelect={setSelectedItem} />)}
          </TreeView>
        </Box>
        <Box flex={1}>
          {selectedItem && <ItemDetails item={selectedItem} />}
        </Box>
      </Box>
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
  onSelect: (item: Item<any>) => void
}

const ItemNode = ({ item, onSelect }: ItemNodeProps) => {
  const children = useSelection(item.select(s => s.children().items as Item<any>[]), [item]) ?? [];

  return (
    <TreeItem nodeId={item.id} label={item.type} onClick={() => onSelect(item)}>
      {children.map((child) => (
        <ItemNode key={child.id} item={child} onSelect={onSelect} />
      ))}
    </TreeItem>
  );
}

interface ItemDetailsProps {
  item: Item<Model<any>>
}

const ItemDetails = ({ item }: ItemDetailsProps) => (
  <>
    <p>Id: {item.id}</p>
    <p>Type: {item.type}</p>
    <p>Model DXN: {item.model.modelMeta.type}</p>
    <p>Model class name: {Object.getPrototypeOf(item.model).constructor.name}</p>
    <JsonTreeView data={modelToObject(item.model)} />
  </>
)
  
const modelToObject = (model: Model<any>) => {
  if(model instanceof ObjectModel) {
    return model.toObject();
  }
  try {
    return model.createSnapshot()
  } catch (err) {
    return model.toJSON();
  }
}