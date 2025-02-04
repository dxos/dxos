//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { type Node } from '@dxos/app-graph';
import { Icon, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Tabs } from '@dxos/react-ui-tabs';

import { useNavTreeContext } from './NavTreeContext';
import { useLoadDescendents } from '../hooks';
import { NAVTREE_PLUGIN } from '../meta';
import { l0ItemType } from '../util';

type L0ItemProps = { item: Node<any> };

const L0Item = ({ item }: L0ItemProps) => {
  const { t } = useTranslation(NAVTREE_PLUGIN);
  const type = l0ItemType(item);
  const Root = type === 'collection' ? 'div' : type === 'tab' ? Tabs.TabPrimitive : 'button';
  const rootProps =
    type === 'tab'
      ? { value: item.id }
      : type === 'collection'
        ? {}
        : type === 'action'
          ? { onClick: useCallback(() => item.properties.data(), [item.properties.data]) }
          : {};
  return (
    <Root {...(rootProps as any)}>
      {item.properties.icon && <Icon icon={item.properties.icon} />}
      <span id={`${item.id}-label`}>{toLocalizedString(item.properties.label, t)}</span>
    </Root>
  );
};

const L0Collection = ({ item }: L0ItemProps) => {
  const navTreeContext = useNavTreeContext();
  useLoadDescendents(item);
  const collectionItems = navTreeContext.getItems(item);
  return (
    <div role='group' className='contents' aria-labelledby={`${item.id}-label`}>
      <L0Item item={item} />
      {collectionItems.map((item) => (
        <L0Item key={item.id} item={item} />
      ))}
    </div>
  );
};

export const L0Menu = ({ topLevelItems }: { topLevelItems: Node<any>[] }) => {
  return (
    <Tabs.Tablist>
      {topLevelItems.map((item) => {
        if (item.properties.role === 'branch') {
          return <L0Collection key={item.id} item={item} />;
        } else {
          return <L0Item key={item.id} item={item} />;
        }
      })}
    </Tabs.Tablist>
  );
};
