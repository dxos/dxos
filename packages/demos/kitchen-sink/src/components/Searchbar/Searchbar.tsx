//
// Copyright 2020 DXOS.org
//

import React, { ChangeEvent, KeyboardEvent, useRef, useState } from 'react';

import {
  Clear as ClearIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { Box, IconButton, InputAdornment, TextField } from '@mui/material';

interface SearchBarProps {
  onChange?: (value: string) => void
  delay?: number
}

/**
 * Text search
 * @param onChange
 * @param delay
 * @constructor
 */
export const Searchbar = ({
  onChange = console.debug,
  delay
}: SearchBarProps) => {
  const [text, setText] = useState('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSearch = () => {
    onChange(text);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const text = event.target.value;
    setText(text);

    if (delay !== undefined) {
      clearTimeout(timeoutRef.current!);
      timeoutRef.current = setTimeout(() => onChange(text), delay);
    }
  }

  const handleCancel = () => {
    setText('');
    onChange('');
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    switch (event.key) {
      case 'Escape': {
        handleCancel();
        break;
      }

      case 'Enter': {
        handleSearch();
        break;
      }
    }
  };

  return (
    <Box sx={{
      display: 'flex',
      flex: 1
    }}>
      <TextField
        autoFocus
        fullWidth
        variant='outlined'
        spellCheck={false}
        autoComplete='off'
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        InputProps={{
          startAdornment:
            <InputAdornment position='end'>
              <IconButton
                sx={{ marginRight: 1 }}
                size='small'
                onClick={handleSearch}
                onMouseDown={handleSearch}
              >
                <SearchIcon />
              </IconButton>
            </InputAdornment>,
          endAdornment:
            <InputAdornment position='end'>
              <IconButton
                size='small'
                onClick={handleCancel}
                onMouseDown={handleCancel}
              >
                <ClearIcon />
              </IconButton>
            </InputAdornment>
        }}
      />
    </Box>
  );
};
