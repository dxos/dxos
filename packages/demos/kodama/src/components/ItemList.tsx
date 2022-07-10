//
// Copyright 2022 DXOS.org
//

import { Box, Text, useFocus, useFocusManager, useInput } from 'ink';
import TextInput from 'ink-text-input';
import React, { FC, useEffect, useState } from 'react';

import { Item, ItemID, PartyKey} from '../types';

const ItemListItem: FC<{
  item?: Item,
  onUpdate?: (itemId: ItemID | undefined, text: string) => void
}> = ({
  item,
  onUpdate
}) => {
  const { isFocused } = useFocus();
  const [text, setText] = useState(item?.title);

  const handleSubmit = (text: string) => {
    if (text.trim().length) {
      if (!item) {
        setText('');
      }

      onUpdate?.(item?.id, text);
    }
  }

  useEffect(() => {
    if (text) {
      handleSubmit(text);
    }
  }, [isFocused]);

  return (
    <Box>
      <Text color='green'>{isFocused ? '> ' : item ? '  ' : '+ '}</Text>
      {isFocused && (
        <TextInput
          placeholder='Create item'
          value={text || ''}
          onChange={setText}
          onSubmit={handleSubmit}
        />
      ) || (
        <Text>{item?.title}</Text>
      )}
    </Box>
  );
};

export const ItemList: FC<{
  partyKey: PartyKey,
  onExit: () => void
}> = ({
  partyKey,
  onExit
}) => {
  const [list, setList] = useState<Item[]>([]);
	const { focusNext } = useFocusManager();

  useEffect(() => {
    focusNext();
  }, []);

  useInput((input, key) => {
    if (key.escape) {
      onExit();
    }
  });

  const handleUpdate = (id: ItemID | undefined, text: string) => {
    if (id) {
      setList(list => {
        const newList = list.map(item => {
          if (item.id === id) {
            return {
              ...item,
              title: text
            }
          } else {
            return item;
          }
        });

        return [...newList];
      });
    } else {
      setList(list => [...list, {
        id: String(Date.now()),
        title: text
      }]);
    }
  }

  return (
    <Box flexDirection='column'>
      <Box marginBottom={1}>
        <Text>Party: {partyKey}</Text>
      </Box>

      {list.map(item => (
        <ItemListItem
          key={item.id}
          item={item}
          onUpdate={handleUpdate}
        />
      ))}

      <ItemListItem
        onUpdate={handleUpdate}
      />
    </Box>
  );
};
