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
  /** Whether the object's type supports a diff view (enables the per-row compare control). */
  diffSupported?: boolean;
  /** The branch the article is currently being compared against, if any. */
  comparing?: string;
  onSwitch: (name: string) => void;
  onCompare: (name: string) => void;
  onMerge: (name: string) => void;
  onDelete: (name: string) => void;
};

/**
 * Presentational list of branches; each row carries its own switch / compare / merge / delete
 * controls.
 */
export const BranchList = ({
  branches,
  current,
  diffSupported,
  comparing,
  onSwitch,
  onCompare,
  onMerge,
  onDelete,
}: BranchListProps) => (
  <List classNames='flex flex-col'>
    {branches.map((name) => (
      <BranchItem
        key={name}
        name={name}
        current={name === current}
        diffSupported={diffSupported}
        comparing={comparing === name}
        onSwitch={onSwitch}
        onCompare={onCompare}
        onMerge={onMerge}
        onDelete={onDelete}
      />
    ))}
  </List>
);
