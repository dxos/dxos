//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { useOutletContext } from 'react-router-dom';

import type { Item, Space } from '@dxos/client';
import { useSelection } from '@dxos/react-client';
import { Composer, DOCUMENT_TYPE } from '@dxos/react-composer';
import { Loading, useTranslation } from '@dxos/react-uikit';
import type { TextModel } from '@dxos/text-model';

export const SpacePage = () => {
  const { t } = useTranslation();
  const { space } = useOutletContext<{ space: Space }>();

  const [item] = useSelection<Item<TextModel>>(space?.select().filter({ type: DOCUMENT_TYPE })) ?? [];

  return item ? <Composer item={item} className='z-0' /> : <Loading label={t('generic loading label')} size='md' />;
};
