//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { type Node } from '@dxos/app-graph';
import { useTranslation } from '@dxos/react-ui';
import { Empty } from '@dxos/react-ui-list';
import { Tabs } from '@dxos/react-ui-tabs';

import { meta } from '#meta';

import { l0ItemType } from '../../util';
import { L1Panel, type L1PanelProps, l1PanelClassNames } from './L1Panel';

/**
 * Delay before the unavailable-workspace message appears: a workspace whose space is still loading has
 * no graph node yet and materializes into a real panel on its own, so it must not flash during that window.
 */
const RENDER_DELAY = '1s';

export type L1TabsProps = Pick<L1PanelProps, 'open' | 'onBack'> & {
  currentItemId: string;
  path: string[];
  topLevelItems: Node.Node[];
};

/**
 * Each workspace is an L1 tab.
 */
export const L1Tabs = ({ topLevelItems, currentItemId, onBack, open, path }: L1TabsProps) => {
  const { t } = useTranslation(meta.profile.key);
  // The current tab can name a workspace that is not in the graph — a link to one this identity never
  // had or which no longer exists, or persisted deck state pointing at one after a profile switch.
  // Without a panel for it the sidebar would render nothing at all.
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
      {!hasCurrentPanel && (
        <Tabs.Panel
          value={currentItemId}
          // Always `grid`: this panel renders only when it is the current tab.
          classNames={[...l1PanelClassNames, 'grid']}
          tabIndex={-1}
          aria-label={t('workspace-unavailable.heading')}
          // An unavailable workspace has no tab in the rail, so the generated `aria-labelledby` would
          // reference a missing element.
          aria-labelledby={undefined}
          data-testid='navtree.workspace.unavailable'
          {...(!open && { inert: true })}
        >
          <Empty
            label={t('workspace-unavailable.description')}
            // Second grid row, so the message clears the rail exactly as an L1 panel's tree does, and
            // hugging its top rather than stretching to the row's full height.
            classNames='row-start-2 self-start animate-fade-in'
            style={{ animationDelay: RENDER_DELAY, animationFillMode: 'backwards' }}
          />
        </Tabs.Panel>
      )}
    </>
  );
};
