//
// Copyright 2022 DXOS.org
//

import { Box } from 'ink';
import React, { FC } from 'react';

import { Party } from '@dxos/client';
import { useSelection } from '@dxos/react-client';

import { List } from '../util';

const LABEL_PROPERTY = 'name'; // TODO(burdon): To make compatable with kitchen-sink/client-test.
const TYPE_ITEM = 'dxos:type/item';

export const ItemList: FC<{
  party: Party
  type?: string
}> = ({
  party,
  type = TYPE_ITEM
}) => {
  // TODO(burdon): Select should not return party item by default.
  // TODO(burdon): Clean-up API (e.g., provide default value as empty list).
  // TODO(burdon): Not updated if model properties change.
  const items = useSelection(party?.select().filter({ type }), [party, type]) ?? [];

  const handleUpdate = (data: { id?: string, text: string }) => {
    if (data.id) {
      const item = party.database.getItem(data.id)!;
      item.model.set(LABEL_PROPERTY, data.text);
    } else {
      void party.database.createItem({
        type,
        props: {
          [LABEL_PROPERTY]: data.text
        }
      });
    }
  };

  if (!party) {
    return null;
  }

  return (
    <Box flexDirection='column' flexGrow={1}>
      <List
        showCount
        onUpdate={handleUpdate}
        items={items.map(item => ({
          id: item.id,
          text: item.model.get(LABEL_PROPERTY) // TODO(burdon): Hack (need schema).
        }))}
      />
    </Box>
  );
};
