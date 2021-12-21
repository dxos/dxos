//
// Copyright 2020 DXOS.org
//

import React, { useState } from 'react';

import { ChevronRight as ExpandIcon, ExpandMore as CollapseIcon } from '@mui/icons-material';
import { TreeItem, TreeView } from '@mui/lab';
import { Box, Typography } from '@mui/material';

import { PartyProxy } from '@dxos/client';
import { Item } from '@dxos/echo-db';
import { MessengerModel } from '@dxos/messenger-model';
import { Model } from '@dxos/model-factory';
import { ObjectModel } from '@dxos/object-model';
import { useParties, useSelection } from '@dxos/react-client';
import { JsonTreeView } from '@dxos/react-components';
import { TextModel } from '@dxos/text-model';

import { PartySelect } from '../components';

export const ItemsViewer = () => {
  const [selectedParty, setSelectedParty] = useState<PartyProxy>();
  const [selectedItem, setSelectedItem] = useState<Item<any>>();

  const parties = useParties();
  const items = useSelection(
    selectedParty?.database.select(s => s
      .filter(item => !item.parent)
      .items as Item<any>[]),
    [selectedParty]
  ) ?? [];

  return (
    <Box sx={{ padding: 2 }}>
      <PartySelect
        parties={parties}
        value={selectedParty}
        onChange={setSelectedParty}
      />
      <Box
        flexDirection='row'
        display='flex'
        padding={2}
      >
        <Box flex={1}>
          <TreeView
            defaultCollapseIcon={<CollapseIcon />}
            defaultExpandIcon={<ExpandIcon />}
            sx={{
              flexGrow: 1,
              height: 240,
              maxWidth: 400,
              overflowY: 'auto'
            }}
          >
            {items.map(item => (
              <ItemNode
                key={item.id}
                item={item}
                onSelect={setSelectedItem}
              />
            ))}
          </TreeView>
        </Box>
        <Box flex={1}>
          {selectedItem && <ItemDetails item={selectedItem} />}
        </Box>
      </Box>
    </Box>
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
};

interface ItemDetailsProps {
  item: Item<Model<any>>
}

const ItemDetails = ({ item }: ItemDetailsProps) => (
  <>
    <div>
      <Typography sx={{ fontWeight: 'bold' }}>Id</Typography>
      <Typography>{item.id}</Typography>
    </div>
    <div>
      <Typography sx={{ fontWeight: 'bold' }}>Type</Typography>
      <Typography>{item.type}</Typography>
    </div>
    <div>
      <Typography sx={{ fontWeight: 'bold' }}>Model DXN</Typography>
      <Typography>{item.model.modelMeta.type}</Typography>
    </div>
    <div>
      <Typography sx={{ fontWeight: 'bold' }}>Model class name</Typography>
      <Typography>{Object.getPrototypeOf(item.model).constructor.name}</Typography>
    </div>
    <Typography sx={{ fontWeight: 'bold' }}>Model data</Typography>
    <JsonTreeView data={modelToObject(item.model)} />
  </>
);

const modelToObject = (model: Model<any>) => {
  if (model instanceof ObjectModel) {
    return model.toObject();
  } else if (model instanceof TextModel) {
    return model.textContent;
  } else if (model instanceof MessengerModel) {
    return model.messages;
  }

  return model.toJSON();
};
