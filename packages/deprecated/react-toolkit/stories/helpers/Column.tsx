//
// Copyright 2020 DXOS.org
//

import { FunctionComponent } from 'react';

import { styled } from '@mui/material';

const ColumnDiv = styled('div')({
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  flex: 1,
  flexShrink: 0,
  padding: 16
});

// TODO(wittjosiah): Props and cleanup.
export const Column: FunctionComponent<any> = ColumnDiv;
