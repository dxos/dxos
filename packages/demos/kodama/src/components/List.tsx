//
// Copyright 2022 DXOS.org
//

import { Box, Text, useFocus, useInput } from 'ink';
import TextInput from 'ink-text-input';
import React, { FC, useEffect, useState } from 'react';

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

  // Save when lose focus.
  useEffect(() => {
    if (text) {
      handleSubmit(text);
    }
  }, [selected]);

  const handleSubmit = (text: string) => {
    const str = text.trim();
    if (str.length && str !== item?.text) {
      onUpdate({ id: item?.id, text: str });
      if (!item?.id) {
        selected && setText('');
      }
    }
  };

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
            onSubmit={(text: string) => handleSubmit(text)}
          />
        </>
      )}
    </Box>
  );
};

export const List: FC<{
  items: ListItem[],
  onUpdate: (item: { id?: string, text: string }) => void,
  pageSize?: number,
  title?: string
  showCount?: boolean
}> = ({
  items = [],
  onUpdate,
  pageSize = 10,
  title,
  showCount
}) => {
  const [{ cursor, startIndex }, setPosition] = useState({ cursor: -1, startIndex: 0 });
  const { isFocused } = useFocus({ autoFocus: true });

  useInput((input, key) => {
    if (isFocused) {
      if (key.upArrow) {
        if (cursor !== 0) {
          setPosition(({ cursor, startIndex }) => {
            const i = (cursor === -1) ? items.length - 1 : cursor - 1;
            if (i < startIndex) {
              startIndex = i;
            }

            return { cursor: i, startIndex };
          });
        }
      }

      if (key.downArrow) {
        if (cursor !== -1) {
          setPosition(({ cursor, startIndex }) => {
            const i = (cursor === items.length - 1) ? -1 : cursor + 1;
            if (i === -1) {
              startIndex = Math.max(0, items.length - pageSize);
            } else if (i >= startIndex + pageSize) {
              startIndex = i + 1 - pageSize;
            }

            return { cursor: i, startIndex };
          });
        }
      }
    }
  });

  // TODO(burdon): Paging.
  const pageItems = items.slice(startIndex, startIndex + pageSize);

  return (
    <Box flexDirection='column'>
      {title && (
        <Box marginBottom={1}>
          <Text color='green'>{title}</Text>
        </Box>
      )}

      {pageItems.map((item, i) => (
        <ListItem
          key={item.id}
          item={item}
          selected={startIndex + i === cursor}
          onUpdate={onUpdate}
        />
      ))}

      <ListItem
        selected={cursor === -1}
        onUpdate={item => {
          onUpdate(item);
          if (!item.id) {
            setPosition({ cursor: -1, startIndex: Math.max(0, items.length + 1 - pageSize) });
          }
        }}
      />

      {showCount && (
        <Box marginTop={1}>
          <Text color='gray'>{items.length} items</Text>
        </Box>
      )}
    </Box>
  );
};
