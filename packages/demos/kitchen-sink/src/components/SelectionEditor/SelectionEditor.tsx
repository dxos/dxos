//
// Copyright 2022 DXOS.org
//

import React, { ChangeEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';

import { TextField } from '@mui/material';

// TODO(burdon): Review devtools-editor (burdon/editor branch).

interface SelectionEditorProps {
  onChange: (selection: string) => void
  initialValue?: string
  delay?: number
  rows?: number
}

/**
 * Simple editor that evaluates text as method calls against a party object.
 * @constructor
 */
export const SelectionEditor = ({
  onChange,
  initialValue,
  delay = 500,
  rows = 5
}: SelectionEditorProps) => {
  const inputRef = useRef<HTMLInputElement>();
  const [text, setText] = useState<string>(initialValue ?? '');
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.selectionStart = text.length;
    }
  }, [inputRef]);

  const handleSubmit = (text: string) => {
    onChange(text);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const text = event.target.value;
    setText(text);

    if (delay !== undefined) {
      clearTimeout(timeoutRef.current!);
      timeoutRef.current = setTimeout(() => handleSubmit(text), delay);
    }
  };

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
    }
  };

  return (
    <TextField
      inputRef={inputRef}
      autoFocus
      fullWidth
      spellCheck={false}
      autoComplete='off'
      placeholder='Enter selection query.'
      multiline
      rows={rows}
      value={text}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      sx={{
        '.MuiInputBase-input': {
          fontFamily: 'monospace'
        }
      }}
    />
  );
};
