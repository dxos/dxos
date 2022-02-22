//
// Copyright 2022 DXOS.org
//

import { FC } from 'react';

import { Item } from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';

export type ItemMeta = {
  icon: FC
  label: string
  plural: string
  color: any
  childTypes?: string[]
}

export interface ItemAdapter {
  title: (item: Item<ObjectModel>) => string
  description: (item: Item<ObjectModel>) => string
  linkedTypes?: (item: Item<ObjectModel>) => string[]
  linkedItems?: (item: Item<ObjectModel>, kind: string) => Item<ObjectModel>[]
  meta?: (type: string) => ItemMeta | undefined
}
