//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { useLayout } from '@dxos/app-framework';
import { type Node } from '@dxos/app-graph';
import { Button, type ButtonProps, Icon, IconButton, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Tree } from '@dxos/react-ui-list';
import { Tabs } from '@dxos/react-ui-tabs';
import { hoverableControlItem, hoverableOpenControlItem, mx } from '@dxos/react-ui-theme';
import { byPosition } from '@dxos/util';

import { useNavTreeContext } from './NavTreeContext';
import { NavTreeItemColumns } from './NavTreeItemColumns';
import { useLoadDescendents } from '../hooks';
import { NAVTREE_PLUGIN } from '../meta';
import { l0ItemType } from '../util';

export type L1PanelProps = {
  item: Node<any>;
  path: string[];
  currentItemId: string;
  onBack?: () => void;
};

const headingBackButtonLabel =
  'absolute inset-0 min-is-0 truncate flex items-center pis-6 transition-[transform,opacity] ease-in-out duration-200';

const HeadingBackButton = ({ title, onClick }: { title: string } & Pick<ButtonProps, 'onClick'>) => {
  const { t } = useTranslation(NAVTREE_PLUGIN);
  return (
    <Button
      variant='ghost'
      classNames='pli-1 flex-1 relative group text-start justify-start bs-[--rail-action] font-normal'
      onClick={onClick}
    >
      <Icon icon='ph--caret-left--regular' size={3} />
      <span
        className={mx(
          headingBackButtonLabel,
          'translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus:translate-y-0 group-focus:opacity-100',
        )}
      >
        {t('back label')}
      </span>
      <span
        className={mx(
          headingBackButtonLabel,
          'translate-y-0 opacity-100 group-hover:-translate-y-2 group-hover:opacity-0 group-focus:-translate-y-2 group-focus:opacity-0',
        )}
      >
        {title}
      </span>
    </Button>
  );
};

const L1Panel = ({ item, path, currentItemId, onBack }: L1PanelProps) => {
  const layout = useLayout();
  const { isAlternateTree, setAlternateTree, ...navTreeContext } = useNavTreeContext();
  const { t } = useTranslation(NAVTREE_PLUGIN);

  // TODO(wittjosiah): Support multiple alternate trees.
  const alternateTree = navTreeContext.getItems(item, 'alternate-tree')[0];
  const alternatePath = useMemo(() => [...path, item.id], [item.id, path]);
  const handleOpen = useCallback(() => setAlternateTree?.(alternatePath, true), [alternatePath, setAlternateTree]);
  const isAlternate = isAlternateTree?.(alternatePath, item) ?? false;
  const alternateGetItems = useCallback(
    (node?: Node, disposition?: string) => {
      const items = navTreeContext.getItems(node, disposition);
      if (node === alternateTree) {
        // TODO(wittjosiah): Sorting is expensive, limit to necessary items for now.
        return items.toSorted((a, b) => byPosition(a.properties, b.properties));
      }
      return items;
    },
    [navTreeContext, alternateTree],
  );

  const handleBack = useCallback(() => {
    if (isAlternate) {
      setAlternateTree?.(alternatePath, false);
    } else {
      onBack?.();
    }
  }, [isAlternate, onBack, alternatePath, setAlternateTree]);

  const title = toLocalizedString(item.properties.label, t);
  const backCapable = item.id.startsWith('!') || isAlternate;

  return (
    <Tabs.Tabpanel
      key={item.id}
      value={item.id}
      classNames={[
        'absolute inset-block-0 inline-end-0 is-[calc(100%-var(--l0-size))] lg:is-[--l1-size] grid-cols-1 grid-rows-[var(--rail-size)_1fr] pbs-[env(safe-area-inset-top)]',
        item.id === currentItemId && 'grid',
      ]}
      tabIndex={-1}
      aria-label={title}
      {...(!layout.sidebarOpen && { inert: 'true' })}
    >
      {item.id === currentItemId && (
        <>
          <h2 className='flex items-center border-be border-separator app-drag pis-1'>
            {backCapable ? (
              <HeadingBackButton title={title} onClick={handleBack} />
            ) : (
              <span className='flex-1 truncate min-is-0 pis-6'>{title}</span>
            )}
            {alternateTree && !isAlternate && (
              <IconButton
                variant='ghost'
                classNames={mx('shrink-0', hoverableControlItem, hoverableOpenControlItem, 'pli-2 pointer-fine:pli-1')}
                iconOnly
                icon={alternateTree.properties.icon ?? 'ph--placeholder--regular'}
                label={toLocalizedString(alternateTree.properties.label ?? alternateTree.id, t)}
                data-testid='treeView.alternateTreeButton'
                onClick={handleOpen}
              />
            )}
            <NavTreeItemColumns path={path} item={item} open />
          </h2>
          <div role='none' className='overflow-y-auto'>
            {isAlternate ? (
              <Tree
                {...navTreeContext}
                getItems={alternateGetItems}
                id={alternateTree.id}
                root={alternateTree}
                path={alternatePath}
                levelOffset={5}
                gridTemplateColumns='[tree-row-start] 1fr min-content min-content min-content [tree-row-end]'
                renderColumns={NavTreeItemColumns}
              />
            ) : (
              <Tree
                {...navTreeContext}
                id={item.id}
                root={item}
                path={path}
                levelOffset={5}
                draggable
                gridTemplateColumns='[tree-row-start] 1fr min-content min-content min-content [tree-row-end]'
                renderColumns={NavTreeItemColumns}
              />
            )}
          </div>
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
  onBack,
}: Pick<L1PanelProps, 'onBack'> & {
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
            return <L1Panel key={item.id} item={item} path={path} currentItemId={currentItemId} onBack={onBack} />;
          default:
            return null;
        }
      })}
    </>
  );
};
