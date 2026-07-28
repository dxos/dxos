//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type Node } from '@dxos/app-graph';

import { l0ItemType } from '../../util';
import { L1Panel, type L1PanelProps } from './L1Panel';
import { L1PanelUnavailable } from './L1PanelUnavailable';

export type L1TabsProps = Pick<L1PanelProps, 'open' | 'onBack'> & {
  currentItemId: string;
  path: string[];
  topLevelItems: Node.Node[];
};

/**
 * Each workspace is an L1 tab.
 */
export const L1Tabs = ({ topLevelItems, currentItemId, onBack, open, path }: L1TabsProps) => {
  // The current tab can name a workspace that is not in the graph (a URL or persisted deck pointing at
  // a workspace this identity does not have); without a panel for it the sidebar would render nothing.
  const hasCurrentPanel = topLevelItems.some((item) => item.id === currentItemId && l0ItemType(item) === 'tab');

  return (
    <>
      {topLevelItems.map((item) => {
        const type = l0ItemType(item);
        if (type === 'tab') {
          return (
            <L1Panel
              key={item.id}
              item={item}
              path={path}
              open={open}
              onBack={onBack}
              isCurrent={item.id === currentItemId}
            />
          );
        }
        return null;
      })}
      {!hasCurrentPanel && <L1PanelUnavailable workspace={currentItemId} open={open} />}
    </>
  );
};
