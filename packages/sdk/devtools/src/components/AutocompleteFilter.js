//
// Copyright 2020 DXOS.org
//

import Autocomplete from '@mui/lab/Autocomplete';
import TextField from '@mui/material/TextField';
import { makeStyles } from '@mui/styles';
import React from 'react';

const useStyles = makeStyles(() => ({
  input: {
    display: 'flex',
    flex: 1
  }
}));

const AutocompleteFilter = ({ label, onChange, value = null, options = [] }) => {
  const classes = useStyles();

  return (
    <Autocomplete
      className={classes.input}
      size='small'
      freeSolo
      autoComplete
      clearOnEscape
      value={value} // Make default to null, see https://github.com/mui-org/material-ui/issues/18173#issuecomment-552420187
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

export default AutocompleteFilter;
