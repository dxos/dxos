//
// Copyright 2022 DXOS.org
//

import React from 'react';

import {
  Language as GraphIcon,
  GridOnOutlined as GridIcon,
  List as ListIcon
} from '@mui/icons-material';

import { IconRadio, IconRadioGroup } from '../../../src';

export enum ViewType {
  List = 'list',
  Board = 'board',
  Graph = 'graph'
}

interface ViewSelectorProps {
  value: string
  onChange: (value: string) => void
}

export const ViewSelector = ({
  value,
  onChange
}: ViewSelectorProps) => {
  return (
    <IconRadioGroup value={value} onChange={onChange}>
      <IconRadio value={ViewType.List} size='small'>
        <ListIcon />
      </IconRadio>
      <IconRadio value={ViewType.Board} size='small'>
        <GridIcon />
      </IconRadio>
      <IconRadio value={ViewType.Graph} size='small'>
        <GraphIcon />
      </IconRadio>
    </IconRadioGroup>
  );
};
