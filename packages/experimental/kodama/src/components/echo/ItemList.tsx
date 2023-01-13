//
// Copyright 2022 DXOS.org
//

import { Box } from 'ink';
import React, { FC } from 'react';

import { Space } from '@dxos/client';
import { useSelection } from '@dxos/react-client';

import { List } from '../util';

// TODO(burdon): To make compatable with kitchen-sink/client-test.
const LABEL_PROPERTY = 'name';
const TYPE_ITEM = 'dxos:type/item';

export const ItemList: FC<{
  space: Space;
  type?: string;
  onCancel?: () => void;
}> = ({ space, type = TYPE_ITEM, onCancel }) => {
  // TODO(burdon): Select should not return space item by default.
  // TODO(burdon): Clean-up API (e.g., provide default value as empty list).
  // TODO(burdon): Not updated if model properties change.
  const items = useSelection(space?.select().filter({ type }), [space, type]) ?? [];

  const handleUpdate = (data: { id?: string; text: string }) => {
    if (data.id) {
      const item = space.database.getItem(data.id)!;
      item.model.set(LABEL_PROPERTY, data.text);
    } else {
      void space.database.createItem({
        type,
        props: {
          [LABEL_PROPERTY]: data.text
        }
      });
    }
  };

  if (!space) {
    return null;
  }

  return (
    <Box flexDirection='column' flexGrow={1}>
      <List
        id={`item-list-${space.key.toHex()}`}
        showCount
        onCancel={onCancel}
        onUpdate={handleUpdate}
        items={items.map((item) => ({
          id: item.id,
          text: item.model.get(LABEL_PROPERTY) // TODO(burdon): Hack (need schema).
        }))}
      />
    </Box>
  );
};
