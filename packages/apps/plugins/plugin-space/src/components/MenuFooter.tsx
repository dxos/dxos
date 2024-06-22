//
// Copyright 2024 DXOS.org
//
import { Planet } from '@phosphor-icons/react';
import React from 'react';

import { getSpace } from '@dxos/client/echo';
import type { EchoReactiveObject } from '@dxos/echo-schema';
import { DropdownMenu, toLocalizedString, useTranslation } from '@dxos/react-ui';

import { SPACE_PLUGIN } from '../meta';
import { getSpaceDisplayName } from '../util';

export const MenuFooter = ({ object }: { object: EchoReactiveObject<any> }) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const space = getSpace(object);
  const spaceName = space ? getSpaceDisplayName(space) : '';
  return space ? (
    <>
      <DropdownMenu.Separator />
      <DropdownMenu.GroupLabel>{t('menu footer label')}</DropdownMenu.GroupLabel>
      <dl className='pis-2 mbe-2 text-xs grid grid-cols-[max-content_1fr] gap-2'>
        <dt className='uppercase text-[.75em] tracking-wide font-medium mbs-px self-start'>{t('location label')}</dt>
        <dd className='line-clamp-3'>
          <Planet className='inline-block mie-1' />
          {toLocalizedString(spaceName, t)}
        </dd>
      </dl>
    </>
  ) : null;
};
