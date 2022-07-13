//
// Copyright 2022 DXOS.org
//

import faker from 'faker';
import React, { useMemo, useState } from 'react';

import { Box } from '@mui/material';

import { PublicKey } from '@dxos/protocols';

import { KeySelect } from './KeySelect';

export default {
  title: 'KeySelect'
};

export const Primary = () => {
  const keys = useMemo(() => faker.datatype.array(10).map(() => PublicKey.random()), []);
  const [selectedKey, setSelectedKey] = useState<PublicKey>();

  return (
    <>
      <Box sx={{ marginBottom: 2 }}>
        <strong>Selected: </strong>
        <span>{selectedKey?.toHex()}</span>
      </Box>
      <KeySelect
        keys={keys}
        selected={selectedKey}
        onChange={key => setSelectedKey(key)}
      />
    </>
  );
};
