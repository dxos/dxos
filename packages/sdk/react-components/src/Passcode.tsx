//
// Copyright 2021 DXOS.org
//

import { keyframes } from '@emotion/react';
import React, { SyntheticEvent, createRef, useEffect, useState } from 'react';

import { useTheme, Box } from '@mui/material';

const DEFAULT_PATTERN = /^[0-9]*$/;

const shakerKeyFrames = keyframes`
  10%, 90% {
    transform: translate3d(-8px, 0, 0);
  }
  
  20%, 80% {
    transform: translate3d(8px, 0, 0);
  }

  30%, 50%, 70% {
    transform: translate3d(-8px, 0, 0);
  }

  40%, 60% {
    transform: translate3d(8px, 0, 0);
  }
`;

type Size = 'small' | 'medium' | 'large';

// https://support.1password.com/compatible-website-design
// https://github.com/apple/password-manager-resources
// https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/autocomplete
// https://developer.apple.com/documentation/security/password_autofill/enabling_password_autofill_on_an_html_input_element
const customAttrs = {
  autoComplete: 'one-time-code',
  'data-com-onepassword-filled': 'dark'
};

const stylesBySize = {
  small: {
    margin: '0 2px',
    padding: '4px',
    width: 16,
    height: 16,
    fontSize: 16,
    fontFamily: 'monospace',
    fontWeight: 100,
    borderRadius: '2px'
  },
  medium: {
    // Standard 40px text field height.
    margin: '0 4px',
    padding: '8px',
    width: 22,
    height: 22,
    fontSize: 22,
    fontFamily: 'monospace',
    fontWeight: 200,
    borderRadius: '4px'
  },
  large: {
    margin: '0 6px',
    padding: '6px',
    width: 36,
    height: 36,
    fontSize: 30,
    fontFamily: 'monospace',
    fontWeight: 200,
    borderRadius: '4px'
  }
};

export interface PasscodeProps {
  attempt?: number; // Required to reset.
  disabled?: boolean;
  shake?: boolean;
  size?: Size;
  length?: number;
  value?: string;
  pattern?: RegExp;
  onChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  sx?: any;
}

/**
 * Displays a multi-digit passcode, which may optionally be editable.
 */
export const Passcode = ({
  attempt = 1,
  disabled = false,
  shake = true,
  size = 'medium',
  length = 4,
  value: initialValue = '',
  pattern = DEFAULT_PATTERN,
  onChange,
  onSubmit,
  sx: sxProps
}: PasscodeProps) => {
  const theme = useTheme();
  const [value, setValue] = useState(initialValue || '');
  const [focused, setFocused] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const inputRef = createRef<HTMLInputElement>();

  useEffect(() => {
    setValue(initialValue || '');
  }, [initialValue]);

  useEffect(() => {
    if (attempt > 1) {
      setValue('');
      if (shake) {
        setInvalid(true);
        setTimeout(() => setInvalid(false), 1000);
      }
    }
  }, [attempt]);

  const handleKeyDown = ({ key }: { key: string }) => {
    if (key === 'Escape') {
      setValue('');
    }
  };

  const handleChange = ({
    target: { value }
  }: {
    target: { value: string };
  }) => {
    if (!value.match(pattern) || value.length > length) {
      return;
    }

    setValue(value);
    if (onChange) {
      onChange(value);
    }

    if (value.length === length) {
      onSubmit?.(value);
    }
  };

  const handleFocusChange = (event: SyntheticEvent) => {
    setFocused(event.type === 'focus');
  };

  const chars = new Array(length);
  for (let i = 0; i < length; i++) {
    chars[i] = i < value.length ? value[i] : '\u00A0'; // TODO(burdon): ???
  }

  const styles = stylesBySize[size];

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        ...sxProps
      }}
      onClick={() => {
        inputRef.current?.focus();
      }}
    >
      {!disabled && onSubmit && (
        <form
          style={{
            position: 'absolute',
            top: -5000, // Offscreen.
            outline: 'none',
            border: 'none'
          }}
        >
          <input
            ref={inputRef}
            className='dxos-passcode'
            value={value}
            type='number'
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={handleFocusChange}
            onFocus={handleFocusChange}
            autoFocus
            {...customAttrs}
          />
        </form>
      )}

      <Box
        sx={{
          display: 'flex',
          boxSizing: 'content-box',
          animation: invalid ? `${shakerKeyFrames} 0.6s linear` : undefined
        }}
      >
        {chars.map((c, i) => (
          <Box
            key={i}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: focused
                ? theme.palette.text.primary
                : theme.palette.text.disabled,
              border: () =>
                focused
                  ? `1px solid ${theme.palette.primary.main}`
                  : `1px solid ${theme.palette.divider}`,
              cursor: disabled ? 'default' : 'pointer',
              ...styles
            }}
          >
            {c}
          </Box>
        ))}
      </Box>
    </Box>
  );
};
