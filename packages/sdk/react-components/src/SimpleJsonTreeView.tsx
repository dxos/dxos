//
// Copyright 2021 DXOS.org
//

import { useTheme } from '@mui/material';
import React from 'react';
import ReactJsonView from 'react-json-view';

import { JsonTreeViewProps } from './JsonTreeView';

/**
 * Displays the config JSON object.
 * @deprecated
 */
export const SimpleJsonTreeView = ({
  data = {},
  onSelect
}: JsonTreeViewProps) => {
  const theme = useTheme();

  // https://www.npmjs.com/package/react-json-view
  return (
    <ReactJsonView
      src={data}
      theme={theme.palette.mode === 'dark' ? 'tomorrow' : 'rjv-default'}
      iconStyle='circle'
      displayDataTypes={false}
      displayObjectSize={false}
      quotesOnKeys={false}
      sortKeys={true}
      onSelect={onSelect}
      // collapsed={1}
    />
  );
};
