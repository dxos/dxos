//
// Copyright 2021 DXOS.org
//

import React, { FunctionComponent, KeyboardEvent, useEffect, useRef, useState } from 'react';

import { Clear as ResetIcon, MenuOpen as DefaultEditIcon } from '@mui/icons-material';
import { useTheme, BaseTextFieldProps, Box, IconButton, InputAdornment, TextField, Typography } from '@mui/material';

export interface CustomTextFieldProps extends BaseTextFieldProps {
  value?: string;
  editing?: boolean;
  readonly?: boolean;
  saveOnBlur?: boolean;
  clickToEdit?: boolean;
  placeholder?: string;
  editIcon?: FunctionComponent;
  onUpdate?: (value: string) => void;
  spellCheck?: boolean;
  autoComplete?: string;
}

/**
 * Click-to-edit text field.
 */
export const CustomTextField = ({
  value,
  editing: editOnly = false,
  readonly = false,
  saveOnBlur = true,
  clickToEdit = false,
  placeholder,
  editIcon: EditIcon = DefaultEditIcon,
  onUpdate, // TODO(burdon): onChange.

  // BaseTextFieldProps
  spellCheck = false,
  autoComplete = 'off',
  variant = 'outlined',
  size = 'small',
  ...props
}: CustomTextFieldProps) => {
  const inputRef = useRef<HTMLInputElement>();
  const [editing, setEditing] = useState(editOnly);
  const [mouseOver, setMouseOver] = useState(false);
  const [text, setText] = useState(value || '');
  const theme = useTheme();

  useEffect(() => {
    setEditing(editOnly);
  }, [editOnly]);

  useEffect(() => {
    setText(value ?? '');
  }, [value]);

  const handleUpdate = () => {
    !editOnly && setEditing(false);
    if (text !== value) {
      onUpdate?.(text);
    }
  };

  const handleReset = () => {
    !editOnly && setEditing(false);
    setText(value || '');
  };

  const handleChange = ({ target: { value } }: { target: { value: string } }) => {
    setText(value);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
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

  // https://mui.com/components/text-fields/#components
  if (editing) {
    return (
      <TextField
        fullWidth
        autoFocus
        value={text || ''}
        placeholder={placeholder}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={() => saveOnBlur && handleUpdate()}
        inputRef={inputRef}
        spellCheck={spellCheck}
        autoComplete={autoComplete}
        InputProps={{
          endAdornment: (
            <InputAdornment position='end'>
              <IconButton
                size='small'
                color='primary'
                onMouseDown={handleReset} // NOTE: onMouseDown (used instead of onClick) fires before onBlur above.
              >
                <ResetIcon />
              </IconButton>
            </InputAdornment>
          )
        }}
        size={size}
        variant={variant}
        {...props}
      />
    );
  }

  // eslint-disable-next-line
  // TODO(burdon): Use https://mui.com/components/text-fields/#unstyled.
  const variantProps: { [key: string]: any | undefined } = {
    small: {
      standard: {
        '.MuiTypography-root': {
          height: 29 // Total=29.
        },
        '& .edit-button': {
          height: '0.01em',
          marginTop: '-3px'
        }
      },
      filled: {
        '.MuiTypography-root': {
          height: 28, // Total=48.
          paddingTop: '20px',
          paddingLeft: '12px'
        },
        '& .edit-button': {
          paddingTop: '7px',
          paddingRight: '12px'
        }
      },
      outlined: {
        '.MuiTypography-root': {
          height: 32, // Total=40.
          paddingTop: '8px',
          paddingLeft: '14px',
          paddingRight: '17px'
        },
        '& .edit-button': {
          paddingTop: '3px',
          paddingRight: '14px'
        }
      }
    },
    medium: {
      standard: {
        '.MuiTypography-root': {
          height: 29, // Total=32.
          paddingTop: '3px'
        },
        '& .edit-button': {
          height: '0.01em',
          marginTop: '-1px'
        }
      },
      filled: {
        '.MuiTypography-root': {
          height: 32, // Total=56.
          paddingTop: '24px',
          paddingLeft: '12px'
        },
        '& .edit-button': {
          paddingTop: '11px',
          paddingRight: '12px'
        }
      },
      outlined: {
        '.MuiTypography-root': {
          height: 41, // Total=56.
          paddingTop: '15px',
          paddingLeft: '14px',
          paddingRight: '17px'
        },
        '& .edit-button': {
          paddingTop: '11px',
          paddingRight: '14px'
        }
      }
    }
  };

  const customProps = variantProps[size || 'small'][variant || 'outlined'];

  return (
    <Box
      sx={{
        display: 'flex',
        flex: 1,
        alignItems: 'flex-start',
        ...customProps
      }}
      onMouseOver={() => setMouseOver(true)}
      onMouseLeave={() => setMouseOver(false)}
    >
      <Typography
        sx={{
          color: text ? undefined : theme.palette.text.disabled,
          boxSizing: 'content-box'
        }}
        onClick={() => !readonly && clickToEdit && setEditing(true)}
      >
        {text || placeholder}
      </Typography>

      <Box sx={{ flex: 1 }} />
      {mouseOver && (
        <Box className='edit-button'>
          <IconButton size='small' title='Edit' onClick={() => !readonly && setEditing(true)}>
            <EditIcon />
          </IconButton>
        </Box>
      )}
    </Box>
  );
};
