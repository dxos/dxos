//
// Copyright 2022 DXOS.org
//

import { Box, Text, useFocus, useFocusManager, useInput } from 'ink';
import React, { FC, useEffect, useState } from 'react';

/**
 * Toolbar.
 */
export const Toolbar: FC<{
  items: { id: string, label: string }[]
  value?: string
  onChange: (id: string) => void
  onSelect: () => void
}> = ({
  items,
  value: controlledValue,
  onChange,
  onSelect
}) => {
  const [selected, setSelected] = useState(controlledValue);
  useEffect(() => {
    handleChange(controlledValue ?? items[0].id);
  }, [controlledValue]);

  const handleChange = (value: string) => {
    if (value !== selected) {
      setSelected(value);
      onChange(value);
    }
  };

  const { isFocused } = useFocus({ autoFocus: true });
  const { focusPrevious, focusNext } = useFocusManager();
  useInput((input, key) => {
    if (!isFocused) {
      return;
    }

    if (key.return) {
      onSelect();
    }

    if (key.upArrow) {
      focusPrevious();
    }

    if (key.downArrow) {
      focusNext();
    }

    if (key.leftArrow) {
      const i = items.findIndex(item => item.id === selected);
      const next = i === 0 ? items.length - 1 : i - 1;
      handleChange(items[next].id);
    }

    if (key.rightArrow) {
      const i = items.findIndex(item => item.id === selected);
      const next = i === items.length - 1 ? 0 : i + 1;
      handleChange(items[next].id);
    }
  });

  return (
    <Box>
      <Text>{isFocused ? '> ' : '  '}</Text>
      {items.map(({ id, label }, i) => (
        <Box
          key={id}
          marginRight={1}
        >
          {i !== 0 && (
            <Text color='#333'>| </Text>
          )}
          <Text
            dimColor={!isFocused}
            color={selected === id ? 'green' : 'white'}
            underline={selected === id}
          >
            {label}
          </Text>
        </Box>
      ))}
    </Box>
  );
};
