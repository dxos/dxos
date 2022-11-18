//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { useOutletContext } from 'react-router-dom';

import type { Item, ObjectModel, Space } from '@dxos/client';
import { useSelection } from '@dxos/react-client';
import { List, LIST_TYPE } from '@dxos/react-list';
import { Loading, useTranslation } from '@dxos/react-uikit';

export const SpacePage = () => {
  const { t } = useTranslation();
  const { space } = useOutletContext<{ space: Space }>();

  const [item] = useSelection<Item<ObjectModel>>(space?.select().filter({ type: LIST_TYPE })) ?? [];

  return item ? (
    <List itemId={item.id} spaceKey={space?.key} />
  ) : (
    <Loading label={t('generic loading label')} size='md' />
  );
};
