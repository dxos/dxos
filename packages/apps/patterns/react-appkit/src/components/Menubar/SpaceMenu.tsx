//
// Copyright 2022 DXOS.org
//

import { Gear, UserPlus, UsersThree } from 'phosphor-react';
import React from 'react';

import { Space } from '@dxos/client';
import { useMembers } from '@dxos/react-client';
import {
  Button,
  defaultInlineSeparator,
  getSize,
  Popover,
  mx,
  buttonStyles,
  useTranslation
} from '@dxos/react-components';

export interface SpaceMenuProps {
  space: Space;
  onClickManageSpace?: () => void;
}

export const SpaceMenu = ({ space, onClickManageSpace }: SpaceMenuProps) => {
  const { t } = useTranslation('appkit');
  const members = useMembers(space.key);

  return (
    <Popover
      openTrigger={
        <>
          <UsersThree className={getSize(4)} />
          <span className='leading-none'>{members.length}</span>
          <span role='none' className={mx(defaultInlineSeparator, 'bs-3')} />
          <UserPlus className={getSize(4)} />
        </>
      }
      slots={{
        content: { collisionPadding: 8, sideOffset: 4, className: 'flex flex-col gap-4 items-center z-[2]' },
        trigger: { className: mx(buttonStyles({ compact: true }), 'pointer-events-auto flex items-center gap-1') }
      }}
      triggerIsInToolbar
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
