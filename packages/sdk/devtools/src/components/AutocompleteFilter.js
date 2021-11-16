//
// Copyright 2020 DXOS.org
//

import React from 'react';

import Autocomplete from '@mui/lab/Autocomplete';
import TextField from '@mui/material/TextField';
import { makeStyles } from '@mui/styles';

const useStyles = makeStyles(() => ({
  input: {
    display: 'flex',
    flex: 1
  }
}));

export const AutocompleteFilter = ({ label, onChange, value = null, options = [] }) => {
  const classes = useStyles();

  return (
    <Autocomplete
      className={classes.input}
      size='small'
      freeSolo
      autoComplete
      clearOnEscape
      // Make default to null.
      // https://github.com/mui-org/material-ui/issues/18173#issuecomment-552420187
      value={value}
      options={options}
      getOptionLabel={option => option}
      onChange={(ev, newValue) => {
        if (newValue && newValue.inputValue) {
          onChange(newValue.inputValue);
        } else {
          onChange(newValue);
        }
      }}
      renderInput={params => (
        <TextField {...params} label={label} variant='outlined' fullWidth />
      )}
    />
  );
};
