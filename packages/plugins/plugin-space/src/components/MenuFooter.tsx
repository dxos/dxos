//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { getSpace } from '@dxos/client/echo';
import { type Obj } from '@dxos/echo';
import { useClient } from '@dxos/react-client';
import { DropdownMenu, Icon, toLocalizedString, useTranslation } from '@dxos/react-ui';

import { meta } from '../meta';
import { getSpaceDisplayName } from '../util';

export const MenuFooter = ({ object }: { object: Obj.Any }) => {
  const { t } = useTranslation(meta.id);
  const client = useClient();
  const space = getSpace(object);
  const spaceName = space ? getSpaceDisplayName(space, { personal: client.spaces.default === space }) : '';
  return space ? (
    <>
      <DropdownMenu.Separator />
      <DropdownMenu.GroupLabel>{t('menu footer label')}</DropdownMenu.GroupLabel>
      <dl className='pis-2 mbe-2 text-xs grid grid-cols-[max-content_1fr] gap-2'>
        <dt className='uppercase text-[.75em] tracking-wide font-medium mbs-px self-start'>{t('location label')}</dt>
        <dd className='line-clamp-3'>
          <Icon icon='ph--planet--regular' classNames='inline-block mie-1' />
          {toLocalizedString(spaceName, t)}
        </dd>
      </dl>
    </>
  ) : null;
};
