//
// Copyright 2022 DXOS.org
//

import React, { ChangeEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';

import { Send as SubmitIcon } from '@mui/icons-material';
import { Box, IconButton, TextField } from '@mui/material';

import { Party } from '@dxos/client';
import { Selection } from '@dxos/echo-db';

// TODO(burdon): Remove React. references.
// TODO(burdon): Change CustomTextField to onChange.
// TODO(burdon): Review devtools-editor (burdon/editor branch).

/**
 * Eval method against a party object.
 * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval#never_use_eval!
 * @param party
 * @param text
 */
const exec = (party: Party, text: string): Selection<any> | undefined => {
  try {
    // eslint-disable-next-line no-new-func
    const exec = new Function(`"use strict"; return function(party) { return party.${text} }`)();
    const result = exec(party);
    if (result instanceof Selection) {
      return result;
    }
  } catch (err) {
    // Ignore.
  }
};

const defaultSelection =
  'select().filter({ type: \'example:type.org\' }).children().filter({ type: \'example:type.project\' })'
    .replace(/\)\./g, ')\n  .');

interface SelectionEditorProps {
  party: Party
  onUpdate: (selection?: Selection<any>) => void
}

/**
 * Simple editor that evaluates text as method calls against a party object.
 * @param party
 * @param onUpdate
 * @constructor
 */
export const SelectionEditor = ({
  party,
  onUpdate
}: SelectionEditorProps) => {
  const inputRef = useRef<HTMLInputElement>();

  // TODO(burdon): Allow passing in.
  const [text, setText] = useState<string>(defaultSelection);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.selectionStart = text.length;
    }
  }, [inputRef]);

  const handleSubmit = (text: string) => {
    const selection = exec(party, text);
    onUpdate(selection);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const text = event.target.value;
    setText(text);
    handleSubmit(text);
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    switch (event.key) {
      case 'Escape': {
        setText('');
        onUpdate();
        break;
      }
    }
  };

  return (
    <Box sx={{
      display: 'flex',
      padding: 0.5
    }}>
      <TextField
        inputRef={inputRef}
        autoFocus
        fullWidth
        multiline
        spellCheck={false}
        rows={5}
        autoComplete='off'
        placeholder='Enter selection query.'
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        sx={{
          flex: 1,
          '.MuiInputBase-input': {
            fontFamily: 'monospace'
          }
        }}
      />

      <div>
        <IconButton onClick={() => handleSubmit(text)}>
          <SubmitIcon />
        </IconButton>
      </div>
    </Box>
  );
};
