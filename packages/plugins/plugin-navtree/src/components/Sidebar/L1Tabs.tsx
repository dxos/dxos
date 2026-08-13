//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import type * as Node from '@dxos/app-graph/Node';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as DeckSchema from '@dxos/plugin-deck/DeckSchema';

import { l0ItemType } from '../../util';
import { L1Panel, type L1PanelProps } from './L1Panel';

export type L1TabsProps = Pick<L1PanelProps, 'open' | 'onBack'> & {
  currentItemId: string;
  path: string[];
  topLevelItems: Node.Node[];
};

/**
 * Each workspace is an L1 tab.
 */
export const L1Tabs = ({ topLevelItems, currentItemId, onBack, open, path }: L1TabsProps) => {
  // The current tab can name a workspace that is not in the graph, in which case it gets an item-less
  // panel carrying the unavailable message rather than no panel at all (a blank sidebar).
  const hasCurrentPanel = topLevelItems.some((item) => item.id === currentItemId && l0ItemType(item) === 'tab');
  // Which spaces have reached the graph. Pinned workspaces (settings, plugins, account) are static
  // and present from the first render, so they say nothing about loading; a space workspace is the
  // first evidence that the client has opened storage and published its space list. While the set
  // is empty it is empty for a reason that has nothing to do with the workspace being asked for.
  const spaces = useMemo(
    () =>
      topLevelItems
        .filter((item) => l0ItemType(item) === 'tab' && !GraphPath.isPinnedWorkspace(item.id))
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
        <L1Panel
          key={currentItemId}
          id={currentItemId}
          path={path}
          open={open}
          // The sentinel deck is "no workspace resolved yet" — held until the space plugin switches
          // to the default space — so there is no workspace being asked for, and nothing to report
          // as missing.
          spaces={currentItemId === DeckSchema.DEFAULT_DECK_ID ? undefined : spaces}
          isCurrent
        />
      )}
    </>
  );
};
