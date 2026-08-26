//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';

import { l0ItemType } from '../../util';
import { L1Panel, type L1PanelProps } from './L1Panel';

export type L1TabsProps = Pick<L1PanelProps, 'open' | 'onBack'> & {
  currentItemId: string;
  path: string[];
  topLevelItems: AppGraphNode.Node[];
};

/**
 * Each workspace is an L1 tab.
 */
export const L1Tabs = ({ topLevelItems, currentItemId, onBack, open, path }: L1TabsProps) => {
  // The current tab can name a workspace that is not in the graph, in which case it gets an item-less
  // panel carrying the unavailable message rather than no panel at all (a blank sidebar).
  const hasCurrentPanel = topLevelItems.some((item) => item.id === currentItemId && l0ItemType(item) === 'tab');
  // Pinned workspaces and the account are present from the first render, so only a workspace-
  // disposition item is evidence that the space list has been published.
  const spaces = useMemo(
    () =>
      topLevelItems
        .filter((item) => AppGraphNode.hasDisposition(item, 'workspace'))
        .map(({ id }) => id)
        .join(),
    [topLevelItems],
  );

  return (
    <>
      {topLevelItems.map((item) => {
        const type = l0ItemType(item);
        if (type === 'tab') {
          return (
            <L1Panel
              key={item.id}
              id={item.id}
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
      {!hasCurrentPanel && (
        <L1Panel key={currentItemId} id={currentItemId} path={path} open={open} spaces={spaces} isCurrent />
      )}
    </>
  );
};
