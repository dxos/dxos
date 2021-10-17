//
// Copyright 2021 DXOS.org
//

import { Clear as ResetIcon } from '@mui/icons-material';
import { FormControl, IconButton, Input, InputAdornment } from '@mui/material';
import React, { useRef, useState } from 'react';

export interface SearchBarProps {
  placeholder?: string
  onSearch?: (text?: string) => void
  delay?: number
}

export const SearchBar = ({ placeholder, onSearch, delay = 0 }: SearchBarProps) => {
  const [text, setText] = useState<string | undefined>();
  const timeout = useRef<ReturnType<typeof setTimeout>>();

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const text = event.target.value as string;
    setText(text);

    timeout.current && clearTimeout(timeout.current);
    timeout.current = setTimeout(() => {
      onSearch && onSearch(text);
    }, delay);
  };

  const handleReset = () => {
    setText(undefined);
    onSearch && onSearch(undefined);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'Enter': {
        onSearch && onSearch(undefined);
        break;
      }
      case 'Escape': {
        handleReset();
        break;
      }
    }
  };

  return (
    <FormControl
      fullWidth
    >
      <Input
        fullWidth
        autoFocus
        spellCheck={false}
        placeholder={placeholder}
        inputProps={{ 'aria-label': 'search' }}
        value={text || ''}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        endAdornment={(
          <InputAdornment position='end'>
            <IconButton
              color='info'
              onClick={handleReset}
            >
              <ResetIcon />
            </IconButton>
          </InputAdornment>
        )}
      />
    </FormControl>
  );
};
