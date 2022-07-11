//
// Copyright 2022 DXOS.org
//

import { Box, Text, useFocus, useFocusManager, useInput } from 'ink';
import React, { FC, useEffect } from 'react';

export type Option = {
  id: string
  label: string
}

const MenuItem: FC<{ option: Option, onSelect: () => void }> = ({ option, onSelect }) => {
  const { isFocused } = useFocus();
  useInput((input, key) => {
    if (isFocused && key.return) {
      onSelect();
    }
  });

  return (
    <Box>
      <Text color='red'>{isFocused ? '> ' : '  '}</Text>
      <Text>{option.label}</Text>
    </Box>
  );
};

// TODO(burdon): https://github.com/vadimdemedes/ink-select-input
export const Menu: FC<{
  options: Option[],
  onSelect: (id: string | null) => void
}> = ({
  options = [],
  onSelect
}) => {
	const { focusNext, focusPrevious } = useFocusManager();

  useInput((input, key) => {
    if (key.escape) {
      onSelect(null)
    }
    if (key.upArrow) {
      focusPrevious();
    }
    if (key.downArrow) {
      focusNext();
    }
  });

  useEffect(() => {
    focusNext();
  }, []);

  return (
    <Box flexDirection='column'>
      {options.map(option => <MenuItem
        key={option.id}
        option={option}
        onSelect={() => onSelect(option.id)}
      />)}
    </Box>
  );
};
