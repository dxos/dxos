//
// Copyright 2022 DXOS.org
//

import { Box, Text, useInput } from 'ink';
import React, { FC, useEffect, useState } from 'react';

/**
 * Toolbar.
 */
export const Toolbar: FC<{
  items: { id: string, label: string }[]
  value?: string
  onChange: (id: string) => void
  isFocused: boolean
}> = ({
  items,
  value: controlledValue,
  onChange,
  isFocused
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

  useInput((input, key) => {
    if (key.leftArrow) {
      const i = items.findIndex(item => item.id === selected);
      handleChange(items[Math.max(0, i - 1)].id);
    } else if (key.rightArrow) {
      const i = items.findIndex(item => item.id === selected);
      handleChange(items[Math.min(items.length - 1, i + 1)].id);
    }
  }, { isActive: isFocused });

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
