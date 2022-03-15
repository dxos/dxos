//
// Copyright 2021 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { Autocomplete, TextField } from '@mui/material';

import { SearchModel, SearchResult } from './SearchModel';

export interface SearchAutocompleteProps<T> {
  model: SearchModel<T>
  onSelect: (value: SearchResult<T>) => void
  groupBy?: string
}

/**
 * Registry search with optional filters.
 */
export const SearchAutocomplete = ({
  model,
  onSelect,
  groupBy
}: SearchAutocompleteProps<any>) => {
  const [results, setResults] = useState(model.results);
  useEffect(() => {
    return model.subscribe(values => setResults(values));
  }, [model]);

  // TODO(burdon): Features:
  //  - https://mui.com/components/autocomplete/#search-as-you-type
  //  - https://mui.com/components/autocomplete/#load-on-open
  //  - https://mui.com/components/autocomplete/#virtualization

  const handleInputChange = (text: string) => {
    model.setText(text);
  }

  const handleChange = (value: any) => {
    onSelect(value);
  }

  return (
    <Autocomplete
      fullWidth
      autoHighlight
      clearOnEscape
      options={results}
      isOptionEqualToValue={(a, b) => a.id === b.id}
      groupBy={groupBy ? option => (option as any)[groupBy] : undefined}
      getOptionLabel={option => option.text}
      onInputChange={(event, text) => handleInputChange(text)}
      onChange={(event, value) => handleChange(value)}
      renderInput={params => (
        <TextField
          {...params}
          autoFocus
          autoComplete='off'
          spellCheck={false}
          variant='standard'
          placeholder='Search'
        />
      )}
    />
  );
};
