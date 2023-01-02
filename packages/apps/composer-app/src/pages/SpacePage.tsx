//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { useOutletContext } from 'react-router-dom';

import type { Item, Space } from '@dxos/client';
import { useSelection } from '@dxos/react-client';
import { Loading } from '@dxos/react-uikit';
import type { TextModel } from '@dxos/text-model';

import { ComposerDocument, COMPOSER_DOCUMENT } from '../containers';

export const SpacePage = () => {
  const { space } = useOutletContext<{ space: Space }>();

  const [item] = useSelection<Item<TextModel>>(space?.select().filter({ type: COMPOSER_DOCUMENT })) ?? [];

  return item ? <ComposerDocument item={item} /> : <Loading label='Loading' size='md' />;
};
