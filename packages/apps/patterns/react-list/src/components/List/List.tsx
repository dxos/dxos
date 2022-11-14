//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { Item } from '@dxos/client';
import { ObjectModel } from '@dxos/object-model';

export interface ListProps {
  item: Item<ObjectModel>;
  className?: string;
}

export const List = ({ item, className }: ListProps) => {
  return <span>List</span>;
};
