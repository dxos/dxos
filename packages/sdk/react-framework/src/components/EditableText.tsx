//
// Copyright 2020 DXOS.org
//

import { InputBase, TextField } from '@mui/material';
import React, { useEffect, useRef, useState } from 'react';

/**
 * Editable text field.
 */
// TODO(burdon): Move to generic ux lib.
export const EditableText = ({
  value,
  onUpdate,
  onChange,
  onEnterKey,
  disabled = false,
  bareInput = false,
  autoFocus = false,
  ...rest
}: {
  value: string,
  onUpdate: (value: string) => void,
  onChange?: (value: string) => void,
  onEnterKey?: (value: string) => void,
  disabled: boolean,
  bareInput: boolean,
  autoFocus: boolean
}) => {
  const [editable, setEditable] = useState(false);
  const [text, setText] = useState(value);
  const textInput = useRef<HTMLInputElement>();

  useEffect(() => {
    setText(value);
  }, [value]);

  useEffect(() => {
    autoFocus && (textInput.current as HTMLInputElement).click();
  }, [textInput.current]);

  const handleUpdate = (newValue: string) => {
    if (value === undefined && !newValue) {
      return;
    }

    if (newValue !== value) {
      onUpdate(newValue);
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
        inputRef={textInput}
      />
    );
  }

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
      inputRef={textInput}
    />
  );
};
