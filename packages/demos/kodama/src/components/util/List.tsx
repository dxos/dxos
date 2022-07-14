//
// Copyright 2022 DXOS.org
//

import { Box, Text, useFocus, useInput } from 'ink';
import TextInput from 'ink-text-input';
import React, { FC, useEffect, useState } from 'react';

import { Panel } from './Panel';

export type ListItem = {
  id: string
  text: string
}

const ListItem: FC<{
  item?: ListItem
  selected?: boolean
  onUpdate?: (item: { id?: string, text: string }) => void
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
      onUpdate?.({ id: item?.id, text: str });
      if (!item?.id) {
        selected && setText('');
      }
    }
  };

  return (
    <Box>
      {!selected && (
        <>
          <Text>{item?.id ? '- ' : '+ '}</Text>
          <Text>{item?.text}</Text>
        </>
      )}

      {selected && (
        <>
          <Text>{'> '}</Text>
          {!onUpdate && (
            <Text>{item?.text}</Text>
          )}

          {onUpdate && (
            <TextInput
              value={text ?? ''}
              focus={selected}
              onChange={(text: string) => selected && setText(text)}
              onSubmit={(text: string) => handleSubmit(text)}
            />
          )}
        </>
      )}
    </Box>
  );
};

export const List: FC<{
  items: ListItem[]
  pageSize?: number
  title?: string
  focusId?: string
  showCount?: boolean
  onUpdate?: (item: { id?: string, text: string }) => void
  onSelect?: (id: string) => void
  onCancel?: () => void
}> = ({
  items = [],
  pageSize = 10,
  title,
  focusId,
  showCount,
  onUpdate,
  onSelect,
  onCancel
}) => {
  const [{ cursor, startIndex }, setPosition] = useState({ cursor: -1, startIndex: 0 });
  const { isFocused } = useFocus({ id: focusId });

  useInput((input, key) => {
    if (!isFocused) {
      return;
    }

    // Escape.
    if (key.escape) {
      onCancel?.();
    }

    // Select.
    if (key.return && onSelect) {
      const id = items[cursor]?.id;
      if (id) {
        onSelect(id);
      }
    }

    // Up.
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

    // Down.
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
  });

  // Paging.
  const pageItems = items.slice(startIndex, startIndex + pageSize);

  return (
    <Panel focused={isFocused}>
      <Box flexDirection='column'>
        {title && (
          <Box marginBottom={1}>
            <Text color={isFocused ? 'green' : 'white'}>{title}</Text>
          </Box>
        )}

        {pageItems.map((item, i) => (
          <ListItem
            key={item.id}
            item={item}
            selected={isFocused && startIndex + i === cursor}
            onUpdate={onUpdate}
          />
        ))}

        {isFocused && (
          <ListItem
            selected={cursor === -1}
            onUpdate={item => {
              onUpdate?.(item);
              if (!item.id) {
                setPosition({ cursor: -1, startIndex: Math.max(0, items.length + 1 - pageSize) });
              }
            }}
          />
        )}

        {showCount && (
          <Box marginTop={(isFocused && onUpdate) || items.length ? 1 : 0}>
            <Text color='gray'>{items.length} items</Text>
          </Box>
        )}
      </Box>
    </Panel>
  );
};
