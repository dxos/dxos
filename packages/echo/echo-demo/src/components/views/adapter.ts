//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { Item } from '@dxos/echo-db';

export interface ItemAdapter {
  key: (key: any) => string
  primary: (item: Item<any>) => string
  secondary?: (item: Item<any>) => string
  icon?: React.FunctionComponent<{item: Item<any>}>
  actions?: (item: Item<any>) => JSX.Element[]
  slices?: (item: Item<any>) => JSX.Element[]
  sort?: (a: Item<any>, b: Item<any>) => number
}
