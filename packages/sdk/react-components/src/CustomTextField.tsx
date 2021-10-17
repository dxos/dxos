//
// Copyright 2021 DXOS.org
//

import React, { useEffect, useRef, useState } from 'react';

import { InputBase, TextField, Typography } from '@mui/material';

export interface CustomTextFieldProps {
  value?: string
  onChange?: (value: string) => void
  onUpdate?: (value: string) => void // TODO(burdon): Rename onEnter, onCancel, etc.
  onEnterKey?: (value: string) => void // TODO(burdon): Remove???
  disabled?: boolean
  autoFocus?: boolean
  // bareInput?: boolean // TODO(burdon): ???
}

/**
 * Click-to-edit text field.
 */
export const CustomTextField = ({
  value,
  onUpdate,
  onChange,
  onEnterKey,
  disabled = false,
  autoFocus = false,
  // bareInput = false,
  ...rest
}: CustomTextFieldProps) => {
  const inputRef = useRef<HTMLInputElement>();
  const [editable, setEditable] = useState(false);
  const [text, setText] = useState(value);

  // TODO(burdon): ???
  useEffect(() => {
    setText(value);
  }, [value]);

  useEffect(() => {
    autoFocus && (inputRef.current as HTMLInputElement).click();
  }, [inputRef.current]);

  const handleUpdate = (newValue: string) => {
    if (value === undefined && !newValue) {
      return;
    }

    if (newValue !== value) {
      onUpdate && onUpdate(newValue);
    }
  };

  const handleChange = ({ target: { value } }: { target: { value: string }}) => {
    setText(value);
    onChange && onChange(value);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    const textField = event.target as HTMLTextAreaElement;
    const { key } = event;
    const { value } = textField;

    switch (key) {
      case 'Enter': {
        setText(value);
        setEditable(false);
        handleUpdate(value);
        onEnterKey && onEnterKey(value);
        break;
      }

      case 'Escape': {
        setEditable(false);
        break;
      }

      default:
    }
  };

  const handleBlur = ({ target: { value } }: { target: { value: string }}) => {
    setText(value);
    setEditable(false);
    handleUpdate(value);
  };

  if (editable) {
    return (
      <TextField
        {...rest}
        value={text || ''}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        fullWidth
        autoFocus={autoFocus}
        inputProps={{
          inputprops: {
            spellCheck: false
          }
        }}
        inputRef={inputRef}
      />
    );
  }

  // TODO(burdon): ???
  /*
  if (bareInput) {
    return (
      <InputBase
        {...rest}
        value={text || ''}
        disabled={disabled}
        onClick={disabled ? undefined : () => setEditable(true)}
        fullWidth
        autoFocus={autoFocus}
        inputProps={{
          inputprops: {
            spellCheck: false
          }
        }}
        inputRef={textInput}
      />
    );
  }
  */

  // TODO(burdon): Just Typography (perforamce).
  return (
    <TextField
      {...rest}
      value={text || ''}
      disabled={disabled}
      onClick={disabled ? undefined : () => setEditable(true)}
      fullWidth
      autoFocus={autoFocus}
      inputProps={{
        inputprops: {
          spellCheck: false
        }
      }}
      inputRef={inputRef}
    />
  );
};
