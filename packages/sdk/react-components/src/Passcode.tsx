//
// Copyright 2021 DXOS.org
//

import { useTheme, Box } from '@mui/material';
import React, { createRef, useEffect, useState } from 'react';

const DEFAULT_PATTERN = /^[0-9]*$/;

/**
 * Displays a multi-digit passcode, which may optionally be editable.
 */
export const Passcode = (
  props: {
    attempt: number,
    editable: boolean,
    length: number,
    value?: string,
    pattern?: RegExp,
    onChange?: (value: string) => void,
    onSubmit: (value: string) => void
  }) => {
  const {
    attempt,
    editable = false,
    length = 4,
    value: initialValue = '',
    pattern = DEFAULT_PATTERN,
    onChange,
    onSubmit
  } = props;

  const theme = useTheme();
  const [value, setValue] = useState(initialValue || '');
  const [focused, setFocused] = useState(false);
  const inputRef = createRef<HTMLInputElement>();

  useEffect(() => {
    setValue(initialValue || '');
  }, [initialValue]);

  useEffect(() => {
    setValue('');
  }, [attempt]);

  const handleKeyDown = ({ key }: { key: string }) => {
    switch (key) {
      case 'Escape': {
        setValue('');
        break;
      }

      default:
        break;
    }
  };

  const handleChange = ({ target: { value } }: { target: { value: string }}) => {
    if (!value.match(pattern) || value.length > length) {
      return;
    }

    setValue(value);
    if (onChange) {
      onChange(value);
    }

    if (value.length === length) {
      onSubmit(value);
    }
  };

  const handleFocusChange = (ev: React.SyntheticEvent) => {
    setFocused(ev.type === 'focus');
  };

  const chars = new Array(length);
  for (let i = 0; i < length; i++) {
    chars[i] = i < value.length ? value[i] : '\u00A0';
  }

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center'
      }}
      onClick={() => {
        inputRef.current?.focus();
      }}
    >
      {editable && (
        <input
          ref={inputRef}
          value={value}
          data-testid='passcode-input'
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleFocusChange}
          onFocus={handleFocusChange}
          autoFocus
          style={{
            position: 'absolute',
            top: -5000, // Offscreen
            outline: 'none',
            border: 'none'
          }}
        />
      )}

      <Box
        sx={{
          display: 'flex',
          boxSizing: 'content-box'
        }}
      >
        {
          chars.map((c, i) => (
            <Box
              key={i}
              sx={{
                margin: 1,
                padding: 1,
                width: 36,
                height: 36,
                fontSize: 30,
                fontWeight: 200,
                fontFamily: 'monospace',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
                border: () => `1px solid ${focused ? theme.palette.action.selected : theme.palette.divider}`,
                backgroundColor: () => focused ? theme.palette.action.hover : theme.palette.background.default,
                color: focused ? theme.palette.text.primary : theme.palette.text.disabled,
                cursor: 'pointer'
              }}
            >
              {c}
            </Box>
          ))
        }
      </Box>
    </Box>
  );
};
