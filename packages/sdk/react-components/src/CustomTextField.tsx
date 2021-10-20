//
// Copyright 2021 DXOS.org
//

import {
  Clear as ResetIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { useTheme, Box, IconButton, InputAdornment, TextField, Typography } from '@mui/material';
import React, { useRef, useState } from 'react';

export interface CustomTextFieldProps {
  value?: string
  onUpdate?: (value: string) => void
  readonly?: boolean
  saveOnBlur?: boolean
  placeholder?: string
}

/**
 * Click-to-edit text field.
 */
export const CustomTextField = ({
  value,
  onUpdate,
  readonly = false,
  saveOnBlur = true,
  placeholder
}: CustomTextFieldProps) => {
  const inputRef = useRef<HTMLInputElement>();
  const [editing, setEditing] = useState(false);
  const [mouseOver, setMouseOver] = useState(false);
  const [text, setText] = useState(value || '');
  const theme = useTheme();

  const handleUpdate = () => {
    setEditing(false);
    if (text !== value) {
      onUpdate && onUpdate(text);
    }
  };

  const handleReset = () => {
    setEditing(false);
    setText(value || '');
  };

  const handleChange = ({ target: { value } }: { target: { value: string }}) => {
    setText(value);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const { key } = event;

    switch (key) {
      case 'Enter': {
        handleUpdate();
        break;
      }

      case 'Escape': {
        handleReset();
        break;
      }

      default:
    }
  };

  // TODO(burdon): Compact version (without border).
  // https://mui.com/components/text-fields/#components
  if (editing) {
    return (
      <TextField
        value={text || ''}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (saveOnBlur) {
            handleUpdate();
          }
        }}
        fullWidth
        autoFocus
        placeholder={placeholder}
        inputRef={inputRef}
        inputProps={{
          inputprops: {
            spellCheck: false
          }
        }}
        InputProps={{
          endAdornment: (
            <InputAdornment position='end'>
              <IconButton
                color='primary'
                onMouseDown={handleReset} // NOTE: onMouseDown fires before onBlur above.
              >
                <ResetIcon />
              </IconButton>
            </InputAdornment>
          )
        }}
      />
    );
  }

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        height: 40,
        paddingLeft: '14px',
        paddingRight: '17px'
      }}
      onMouseOver={() => setMouseOver(true)}
      onMouseLeave={() => setMouseOver(false)}
    >
      <Typography
        sx={{
          color: text ? undefined : theme.palette.text.disabled
        }}
      >
        {text || placeholder}
      </Typography>
      <Box sx={{ flex: 1 }} />
      {mouseOver && (
        <IconButton
          size='small'
          onClick={() => !readonly && setEditing(true)}
          sx={{ paddingLeft: '8px' }}
        >
          <EditIcon />
        </IconButton>
      )}
    </Box>
  );
};
