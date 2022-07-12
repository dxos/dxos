//
// Copyright 2022 DXOS.org
//

import { Box, Text, useFocus, useInput } from 'ink';
import TextInput from 'ink-text-input';
import React, { FC, useState } from 'react';

export type ListItem = {
  id: string
  text: string
}

const ListItem: FC<{
  item?: ListItem,
  selected?: boolean,
  onUpdate: (item: { id?: string, text: string }) => void
}> = ({
  item,
  selected,
  onUpdate
}) => {
  const [text, setText] = useState(item?.text);

  return (
    <Box>
      {!selected && (
        <Text>{item?.id ? '- ' : '+ '}{item?.text}</Text>
      )}

      {selected && (
        <>
          <Text>{'> '}</Text>
          <TextInput
            value={text ?? ''}
            focus={selected}
            onChange={(text: string) => selected && setText(text)}
            onSubmit={(text: string) => {
              const str = text.trim();
              if (str.length) {
                onUpdate({ id: item?.id, text: str });
                if (!item?.id) {
                  selected && setText('');
                }
              }
            }}
          />
        </>
      )}
    </Box>
  );
};

export const List: FC<{
  items: ListItem[],
  onUpdate: (item: { id?: string, text: string }) => void
}> = ({
  items = [],
  onUpdate
}) => {
  const [index, setIndex] = useState(-1);
  const { isFocused } = useFocus({ autoFocus: true });

  useInput((input, key) => {
    if (isFocused) {
      if (key.upArrow) {
        setIndex(index => (index === -1) ? items.length - 1 : index - 1);
      }
      if (key.downArrow) {
        setIndex(index => (index === items.length - 1) ? -1 : index + 1);
      }
    }
  });

  // TODO(burdon): Paging.

  return (
    <Box flexDirection='column'>
      {items.map((item, i) => (
        <ListItem
          key={item.id}
          item={item}
          selected={index === i}
          onUpdate={onUpdate}
        />
      ))}

      <ListItem
        selected={index === -1}
        onUpdate={item => {
          onUpdate(item);
          if (!item.id) {
            setIndex(-1);
          }
        }}
      />
    </Box>
  );
};
