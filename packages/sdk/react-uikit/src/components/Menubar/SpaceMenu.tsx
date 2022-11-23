//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import { Gear, UserPlus, UsersThree } from 'phosphor-react';
import React from 'react';
import { useTranslation } from 'react-i18next';

import { Space } from '@dxos/client';
import { useMembers } from '@dxos/react-client';
import { Button, defaultInlineSeparator, getSize, Popover } from '@dxos/react-ui';

export interface SpaceMenuProps {
  space: Space;
  onClickManageSpace?: () => void;
}

export const SpaceMenu = ({ space, onClickManageSpace }: SpaceMenuProps) => {
  const { t } = useTranslation('uikit');
  const members = useMembers(space.key);

  return (
    <Popover
      openTrigger={
        <Button compact className='flex items-center gap-1'>
          <UsersThree className={getSize(4)} />
          <span className='leading-none'>{members.length}</span>
          <span role='none' className={cx(defaultInlineSeparator, 'bs-3')} />
          <UserPlus className={getSize(4)} />
        </Button>
      }
      collisionPadding={8}
      sideOffset={4}
      className='flex flex-col gap-4 items-center'
    >
      {onClickManageSpace && (
        <Button className='flex w-full gap-2' onClick={onClickManageSpace}>
          <Gear className={getSize(5)} />
          <span>{t('manage space label')}</span>
        </Button>
      )}
    </Popover>
  );
};
