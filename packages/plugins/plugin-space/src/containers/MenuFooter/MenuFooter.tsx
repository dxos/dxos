//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { isPersonalSpace } from '@dxos/app-toolkit';
import { getSpace } from '@dxos/client/echo';
import { type Obj } from '@dxos/echo';
import { DropdownMenu, Icon, toLocalizedString, useTranslation } from '@dxos/react-ui';

import { meta } from '../../meta';
import { getSpaceDisplayName } from '../../util';

export const MenuFooter = ({ object }: { object: Obj.Unknown }) => {
  const { t } = useTranslation(meta.id);
  const space = getSpace(object);
  const spaceName = space ? getSpaceDisplayName(space, { personal: isPersonalSpace(space) }) : '';
  return space ? (
    <>
      <DropdownMenu.Separator />
      <DropdownMenu.GroupLabel>{t('menu footer label')}</DropdownMenu.GroupLabel>
      <dl className='ps-2 mb-2 text-xs grid grid-cols-[max-content_1fr] gap-2'>
        <dt className='uppercase text-[.75em] tracking-wide font-medium mt-px self-start'>{t('location label')}</dt>
        <dd className='line-clamp-3'>
          <Icon icon='ph--planet--regular' classNames='inline-block me-1' />
          {toLocalizedString(spaceName, t)}
        </dd>
      </dl>
    </>
  ) : null;
};
