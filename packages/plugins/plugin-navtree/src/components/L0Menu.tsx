//
// Copyright 2025 DXOS.org
//

import React, { type MouseEvent, useCallback, useMemo, useState } from 'react';

import { type Node } from '@dxos/app-graph';
import { Icon, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Tabs } from '@dxos/react-ui-tabs';

import { useNavTreeContext } from './NavTreeContext';
import { useLoadDescendents } from '../hooks';
import { NAVTREE_PLUGIN } from '../meta';
import { l0ItemType } from '../util';

type L0ItemProps = {
  item: Node<any>;
  parent?: Node<any>;
  path: string[];
  onCollectionItemClick?: (event: MouseEvent) => void;
};

const useL0ItemClick = ({ item, parent, path, onCollectionItemClick }: L0ItemProps, type: string) => {
  const { onSelect, isCurrent } = useNavTreeContext();
  return useCallback(
    (event: MouseEvent) => {
      switch (type) {
        case 'collection':
          return onCollectionItemClick?.(event);
        case 'link':
          return onSelect?.({ item, path, current: !isCurrent(path, item), option: event.altKey });
        case 'action': {
          const {
            data: invoke,
            properties: { caller },
          } = item;
          return invoke?.(caller ? { node: parent, caller } : { node: parent });
        }
      }
    },
    [item, type, onSelect, isCurrent, parent, onCollectionItemClick],
  );
};

const L0Item = ({ item, parent, path, onCollectionItemClick }: L0ItemProps) => {
  const { t } = useTranslation(NAVTREE_PLUGIN);
  const type = l0ItemType(item);
  const itemPath = useMemo(() => [...path, item.id], [item.id, path]);
  const Root =
    type === 'collection' ? (onCollectionItemClick ? 'button' : 'h2') : type === 'tab' ? Tabs.TabPrimitive : 'button';
  const handleClick = useL0ItemClick({ item, path: itemPath, parent, onCollectionItemClick }, type);
  const rootProps = type === 'tab' ? { value: item.id, tabIndex: 0 } : { onClick: handleClick };
  return (
    <Root {...(rootProps as any)}>
      {item.properties.icon && <Icon icon={item.properties.icon} />}
      <span id={`${item.id}-label`}>{toLocalizedString(item.properties.label, t)}</span>
    </Root>
  );
};

const L0Collection = ({ item, path, parent, onCollectionItemClick }: L0ItemProps) => {
  const navTreeContext = useNavTreeContext();
  useLoadDescendents(item);
  const collectionItems = navTreeContext.getItems(item);
  const groupPath = useMemo(() => [...path, item.id], [item.id, path]);
  return (
    <div role='group' className='contents' aria-labelledby={`${item.id}-label`}>
      <L0Item item={item} parent={parent} path={groupPath} onCollectionItemClick={onCollectionItemClick} />
      {collectionItems.map((collectionItem) => (
        <L0Item key={collectionItem.id} item={collectionItem} parent={item} path={groupPath} />
      ))}
    </div>
  );
};

export const L0Menu = ({
  topLevelItems,
  parent,
  path,
}: {
  topLevelItems: Node<any>[];
  parent?: Node<any>;
  path: string[];
}) => {
  const [expanded, setExpanded] = useState(false);
  const handleCollectionItemClick = useCallback((event: MouseEvent) => setExpanded(!expanded), [expanded]);
  return (
    <Tabs.Tablist
      data-state={expanded ? 'expanded' : 'collapsed'}
      classNames='bg-deck absolute inset-block-0 inline-start-0 !is-[--l0-size] data-[state=expanded]:!is-[--l1-size] transition-[inline-size] duration-200 ease-in-out contain-layout overflow-hidden'
    >
      {topLevelItems.map((item) => {
        if (l0ItemType(item) === 'collection') {
          return (
            <L0Collection
              key={item.id}
              item={item}
              parent={parent}
              path={path}
              onCollectionItemClick={handleCollectionItemClick}
            />
          );
        } else {
          return <L0Item key={item.id} item={item} parent={parent} path={path} />;
        }
      })}
    </Tabs.Tablist>
  );
};
