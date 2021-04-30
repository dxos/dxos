//
// Copyright 2020 DXOS.org
//

import clsx from 'clsx';
import React, { createRef, useEffect, useState } from 'react';

import grey from '@material-ui/core/colors/grey';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex'
  },

  input: {
    position: 'absolute',
    width: 1,
    height: 1,
    clip: 'rect(1px,1px,1px,1px)',
    outline: 'none'
  },

  char: {
    margin: theme.spacing(0.5),
    padding: theme.spacing(1),
    paddingLeft: theme.spacing(2),
    paddingRight: theme.spacing(2),
    border: '1px solid',
    borderColor: grey[200],
    fontSize: 32,
    fontFamily: 'monospace',
    color: grey[700],
    cursor: 'pointer'
  },

  focused: {
    '& > div': {
      borderColor: grey[400]
    }
  }
}));

const DEFAULT_PATTERN = /^[0-9]*$/;

/**
 * Displays a multi-digit passcode, which may optionally be editable.
 */
const Passcode = (
  props: {
    attempt: number,
    editable: boolean,
    length: number,
    value?: string,
    pattern?: RegExp,
    onChange: (value: string) => void,
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
  const classes = useStyles();
  const [value, setValue] = useState(initialValue || '');
  const [focused, setFocused] = useState(false);
  const input = createRef<HTMLInputElement>();

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

  const handleFocus = (ev: React.SyntheticEvent) => {
    setFocused(ev.type === 'focus');
  };

  const chars = new Array(length);
  for (let i = 0; i < length; i++) {
    chars[i] = i < value.length ? value[i] : '\u00A0';
  }

  return (
    <div onClick={() => {
      if (input.current) {
        (input.current as HTMLInputElement).focus();
      }
    }}>
      {editable && (
        <input
          ref={input}
          className={classes.input}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleFocus}
          onFocus={handleFocus}
          autoFocus
          data-testid="passcode-input"
        />
      )}

      <div className={clsx(classes.root, focused && classes.focused)}>
        {
          chars.map((c, i) => (
            <div key={i} className={classes.char}>{c}</div>
          ))
        }
      </div>
    </div>
  );
};

export default Passcode;
