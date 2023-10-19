//
// Copyright 2022 DXOS.org
//

import { Gear, UserPlus, UsersThree } from '@phosphor-icons/react';
import React from 'react';

import { Button, useTranslation } from '@dxos/react-ui';
import { inlineSeparator, getSize, mx, defaultTx } from '@dxos/react-ui-theme';
import { type Space, useMembers } from '@dxos/react-client/echo';

import { Popover } from '../Popover';

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
          <span role='none' className={mx(inlineSeparator, 'bs-3')} />
          <UserPlus className={getSize(4)} />
        </>
      }
      slots={{
        content: { collisionPadding: 8, sideOffset: 4, className: 'flex flex-col gap-4 items-center z-[2]' },
        trigger: {
          className: defaultTx(
            'button.root',
            'button button--popover-trigger',
            {},
            'pointer-events-auto flex items-center gap-1',
          ),
        },
      }}
      triggerIsInToolbar
    >
      {onClickManageSpace && (
        <Button classNames='flex w-full gap-2' onClick={onClickManageSpace}>
          <Gear className={getSize(5)} />
          <span>{t('manage space label')}</span>
        </Button>
      )}
    </Popover>
  );
};
