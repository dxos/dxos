//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { Surface } from '@dxos/app-framework';
import { type Node } from '@dxos/app-graph';
import { toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Tree } from '@dxos/react-ui-list';
import { Tabs } from '@dxos/react-ui-tabs';

import { useNavTreeContext } from './NavTreeContext';
import { NavTreeItemColumns } from './NavTreeItemColumns';
import { useLoadDescendents } from '../hooks';
import { NAVTREE_PLUGIN } from '../meta';
import { l0ItemType } from '../util';

type L1PanelProps = { item: Node<any>; path: string[]; currentItemId: string };

const L1Panel = ({ item, path, currentItemId }: L1PanelProps) => {
  const navTreeContext = useNavTreeContext();
  const itemPath = useMemo(() => [...path, item.id], [item.id, path]);
  const { t } = useTranslation(NAVTREE_PLUGIN);
  // const { getProps } = useNavTreeContext();
  // const { id, testId } = getProps?.(item, path) ?? {};
  return (
    <Tabs.Tabpanel
      key={item.id}
      value={item.id}
      // data-testid={testId}
      // data-itemid={id}
      classNames={[
        'absolute inset-block-0 inline-end-0 is-[calc(100%-var(--l0-size))] grid-cols-1',
        item.id === currentItemId && 'grid',
        navTreeContext.hoistStatusbar
          ? 'grid-rows-[var(--rail-size)_1fr_min-content]'
          : 'grid-rows-[var(--rail-size)_1fr]',
      ]}
      tabIndex={-1}
    >
      {item.id === currentItemId && (
        <>
          <h2 className='flex items-center border-be border-separator pis-4'>
            <span className='flex-1 truncate'>{toLocalizedString(item.properties.label, t)}</span>
            <NavTreeItemColumns path={itemPath} item={item} open />
          </h2>
          <div role='none' className='overflow-y-auto'>
            <Tree
              {...navTreeContext}
              id={item.id}
              root={item}
              path={itemPath}
              levelOffset={5}
              draggable
              gridTemplateColumns='[tree-row-start] 1fr min-content min-content min-content [tree-row-end]'
              renderColumns={NavTreeItemColumns}
            />
          </div>
          {!navTreeContext.hoistStatusbar && <Surface role='status-bar--sidebar-footer' limit={1} />}
        </>
      )}
    </Tabs.Tabpanel>
  );
};

const L1PanelCollection = ({ item, path, currentItemId }: L1PanelProps) => {
  const { getItems } = useNavTreeContext();
  useLoadDescendents(item);
  const collectionItems = getItems(item);
  const groupPath = useMemo(() => [...path, item.id], [item.id, path]);
  return (
    <>
      {collectionItems
        .filter((item) => l0ItemType(item) === 'tab')
        .map((item) => (
          <L1Panel key={item.id} item={item} path={groupPath} currentItemId={currentItemId} />
        ))}
    </>
  );
};

export const L1Panels = ({
  topLevelItems,
  path,
  currentItemId,
}: {
  topLevelItems: Node<any>[];
  path: string[];
  currentItemId: string;
}) => {
  return (
    <>
      {topLevelItems.map((item) => {
        const type = l0ItemType(item);
        switch (type) {
          case 'collection':
            return <L1PanelCollection key={item.id} item={item} path={path} currentItemId={currentItemId} />;
          case 'tab':
            return <L1Panel key={item.id} item={item} path={path} currentItemId={currentItemId} />;
          default:
            return null;
        }
      })}
    </>
  );
};
