//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type Node } from '@dxos/app-graph';

import { l0ItemType } from '../../util';

import { L1Panel, type L1PanelProps } from './L1Panel';

export type L1TabsProps = Pick<L1PanelProps, 'open' | 'currentItemId' | 'onBack'> & {
  path: string[];
  topLevelItems: Node.Node[];
};

/**
 * Each workspace is an L1 tab.
 */
export const L1Tabs = ({ topLevelItems, onBack, ...props }: L1TabsProps) => {
  return (
    <>
      {topLevelItems.map((item) => {
        const type = l0ItemType(item);
        if (type === 'tab') {
          return <L1Panel key={item.id} item={item} {...props} onBack={onBack} />;
        }
        return null;
      })}
    </>
  );
};
