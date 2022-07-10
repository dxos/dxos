//
// Copyright 2022 DXOS.org
//

import { Box, Text, useFocus, useFocusManager, useInput } from 'ink';
import TextInput from 'ink-text-input';
import React, { FC, useEffect, useState } from 'react';

export type Item = {
  id: string
  title: string
}

export const ListItem: FC<{
  item?: Item,
  onSubmit?: (id: string | undefined, text: string) => void
}> = ({
  item,
  onSubmit
}) => {
  const { isFocused } = useFocus();
  const [text, setText] = useState(item?.title);

  const handleSubmit = (text: string) => {
    if (text.trim().length) {
      if (!item) {
        setText('');
      }

      onSubmit?.(item?.id, text);
    }
  }

  useEffect(() => {
    if (text) {
      handleSubmit(text);
    }
  }, [isFocused]);

  return (
    <Box>
      <Text color='green'>{isFocused ? '> ' : '- '}</Text>
      {isFocused && (
        <TextInput
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

export const List: FC<{
  onExit: () => void
}> = ({
  onExit
}) => {
  const [list, setList] = useState<Item[]>([]);
	const { focusNext } = useFocusManager();

  useEffect(() => {
    focusNext();
  }, []);

  useInput((input, key) => {
    if (key.escape) {
      onExit()
    }
  });

  const handleSubmit = (id: string | undefined, text: string) => {
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
      {list.map(item => (
        <ListItem
          key={item.id}
          item={item}
          onSubmit={handleSubmit}
        />
      ))}

      {list.length === 0 && (
        <Text>Enter item:</Text>
      )}

      <ListItem
        onSubmit={handleSubmit}
      />
    </Box>
  );
};
