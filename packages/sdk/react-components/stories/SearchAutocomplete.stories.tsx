//
// Copyright 2021 DXOS.org
//

import faker from 'faker';
import React, { useMemo, useState } from 'react';

import { Box } from '@mui/material';

import { SearchAutocomplete, SearchResult, TextSearchModel } from '../src';

export default {
  title: 'react-components/SearchAutocomplete'
};

const createValues = (n = 100) =>
  Array.from({ length: n }).map((_, i) => ({
    id: String(i),
    text: faker.lorem.word().toLowerCase(),
    value: String(i)
  }));

export const Primary = () => {
  const [value, setValue] = useState<SearchResult<string>>();
  const model = useMemo(
    () => new TextSearchModel<string>(createValues(100)),
    []
  );

  return (
    <Box sx={{ margin: 2 }}>
      <SearchAutocomplete model={model} onSelect={(value) => setValue(value)} />

      <Box sx={{ marginTop: 2 }}>{JSON.stringify(value)}</Box>
    </Box>
  );
};
