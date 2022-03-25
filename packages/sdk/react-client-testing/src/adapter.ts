//
// Copyright 2022 DXOS.org
//

import { FC } from 'react';

import {
  Business as OrgIcon,
  CheckBoxOutlineBlank as DefaultIcon,
  PersonOutline as PersonIcon,
  WorkOutline as ProjectIcon
} from '@mui/icons-material';
import { colors } from '@mui/material';

import { Item } from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';

import { TestType } from './builder';

export const typeMeta: { [i: string]: ItemMeta } = {
  [TestType.Org]: {
    icon: OrgIcon,
    label: 'Organization',
    plural: 'Organizations',
    color: colors.brown,
    childTypes: [TestType.Person, TestType.Project]
  },
  [TestType.Person]: {
    icon: PersonIcon,
    label: 'Person',
    plural: 'People',
    color: colors.indigo
  },
  [TestType.Project]: {
    icon: ProjectIcon,
    label: 'Project',
    plural: 'Projects',
    color: colors.blue,
    childTypes: [TestType.Task]
  },
  [TestType.Task]: {
    icon: DefaultIcon,
    label: 'Task',
    plural: 'Tasks',
    color: colors.green
  }
};

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

/**
 * Get related data from items.
 */
export const itemAdapter: ItemAdapter = {
  title: (item: Item<ObjectModel>) => {
    return item.model.getProperty('title');
  },

  description: (item: Item<ObjectModel>) => {
    return item.model.getProperty('description');
  },

  linkedTypes: (item: Item<ObjectModel>) => {
    const types = new Set<string>();
    item.children.forEach(item => item.type && types.add(item.type));
    return Array.from(types);
  },

  linkedItems: (item: Item<ObjectModel>, kind: string) => {
    return item.children.filter(item => item.type === kind);
  },

  meta: (type: string) => typeMeta[type]
};
