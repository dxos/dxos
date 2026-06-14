//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { List } from '@dxos/react-ui';

import { BranchItem } from './BranchItem';

export type BranchListProps = {
  /** Branch names in display order (the parent owns ordering, e.g. snapshotted by recency). */
  branches: string[];
  /** The branch the device currently views. */
  current: string;
  onSwitch: (name: string) => void;
  onMerge: (name: string) => void;
  onDelete: (name: string) => void;
};

/** Presentational list of branches; each row carries its own switch / merge / delete controls. */
export const BranchList = ({ branches, current, onSwitch, onMerge, onDelete }: BranchListProps) => (
  <List classNames='flex flex-col'>
    {branches.map((name) => (
      <BranchItem
        key={name}
        name={name}
        current={name === current}
        onSwitch={onSwitch}
        onMerge={onMerge}
        onDelete={onDelete}
      />
    ))}
  </List>
);
