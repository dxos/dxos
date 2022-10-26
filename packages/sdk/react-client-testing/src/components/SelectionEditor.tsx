//
// Copyright 2022 DXOS.org
//

import React, { ChangeEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';

import { TextField } from '@mui/material';

interface SelectionEditorProps {
  onChange: (selection: string) => void;
  initialValue?: string;
  delay?: number;
  rows?: number;
}

const caretMarker = '$1';

// TODO(burdon): Customize.
const completions = [
  {
    match: 'children',
    replace: 'children()'
  },
  {
    match: 'filter',
    replace: `filter({ type: '${caretMarker}' })`
  },
  {
    match: 'parent',
    replace: 'parent()'
  },
  {
    match: 'select',
    replace: 'select()'
  }
];

/**
 * Simple editor that evaluates text as method calls against a party object.
 * @constructor
 */
export const SelectionEditor = ({ onChange, initialValue, delay = 500, rows = 6 }: SelectionEditorProps) => {
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

  const handleCancel = () => {
    setText('');
    onChange('');
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    let text = event.target.value;

    // Auto-indent.
    const inputEvent: InputEvent = event.nativeEvent as InputEvent;
    if (inputEvent.inputType === 'insertLineBreak') {
      const i = inputRef.current!.selectionStart ?? 0;
      text = text.slice(0, i) + '  ' + text.slice(i);
      setTimeout(() => {
        inputRef.current!.selectionStart = i + 2;
        inputRef.current!.selectionEnd = i + 2;
      });
    }

    setText(text);

    if (delay !== undefined) {
      clearTimeout(timeoutRef.current!);
      timeoutRef.current = setTimeout(() => handleSubmit(text), delay);
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    switch (event.key) {
      case ' ': {
        // Auto-complete.
        if (event.ctrlKey) {
          const i = inputRef.current!.selectionStart ?? 0;
          const start = text.lastIndexOf('.', i) + 1;
          const span = text.slice(start, i);
          const match = completions.find(({ match }) => match.startsWith(span));
          if (match) {
            let str = text.slice(0, start) + match.replace + text.slice(i);
            const pos = str.indexOf(caretMarker);
            if (pos !== -1) {
              str = str.replace(caretMarker, '');
              setTimeout(() => {
                inputRef.current!.selectionStart = pos;
                inputRef.current!.selectionEnd = pos;
              });
            }

            setText(str);
          }
        }
        break;
      }

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
      placeholder='Enter selection query (CTRL-shift to auto-complete).'
      multiline
      rows={rows}
      value={text}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      inputProps={{
        'data-id': 'test-input-selection'
      }}
      sx={{
        '.MuiInputBase-input': {
          fontFamily: 'monospace'
        }
      }}
    />
  );
};
