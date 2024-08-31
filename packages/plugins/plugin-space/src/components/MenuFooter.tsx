//
// Copyright 2024 DXOS.org
//
import { Planet } from '@phosphor-icons/react';
import React from 'react';

import { getSpace } from '@dxos/client/echo';
import type { EchoReactiveObject } from '@dxos/echo-schema';
import { useClient } from '@dxos/react-client';
import { DropdownMenu, toLocalizedString, useTranslation } from '@dxos/react-ui';

import { SPACE_PLUGIN } from '../meta';
import { getSpaceDisplayName } from '../util';

export const MenuFooter = ({ object }: { object: EchoReactiveObject<any> }) => {
  const { t } = useTranslation(SPACE_PLUGIN);
  const client = useClient();
  const space = getSpace(object);
  const spaceName = space ? getSpaceDisplayName(space, { personal: client.spaces.default === space }) : '';
  return space ? (
    <>
      <DropdownMenu.Separator />
      <DropdownMenu.GroupLabel>{t('menu footer label')}</DropdownMenu.GroupLabel>
      <dl className='pis-2 mbe-2 grid grid-cols-[max-content_1fr] gap-2 text-xs'>
        <dt className='mbs-px self-start text-[.75em] font-medium uppercase tracking-wide'>{t('location label')}</dt>
        <dd className='line-clamp-3'>
          <Planet className='mie-1 inline-block' />
          {toLocalizedString(spaceName, t)}
        </dd>
      </dl>
    </>
  ) : null;
};
