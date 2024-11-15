//
// Copyright 2024 DXOS.org
//

import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import React, { type FC, useState } from 'react';

import { Button } from './Button';
import DropdownMenu from './DropdownMenu';
import { Icon } from './Icon/Icon';
import { participantCount, ParticipantsDialog } from './ParticipantsMenu';
import { SettingsDialog } from './SettingsDialog';
import { useRoomContext } from '../hooks/useRoomContext';

export const OverflowMenu: FC<{}> = () => {
  const {
    room: { otherUsers, identity },
    dataSaverMode,
    setDataSaverMode,
  } = useRoomContext()!;
  const [settingsMenuOpen, setSettingMenuOpen] = useState(false);
  const [participantsMenuOpen, setParticipantsMenuOpen] = useState(false);
  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button displayType='secondary'>
            <VisuallyHidden>More options</VisuallyHidden>
            <Icon type='EllipsisVerticalIcon' />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content sideOffset={5}>
            <DropdownMenu.Item onSelect={() => setDataSaverMode(!dataSaverMode)}>
              <Icon type='WifiIcon' className='mr-2' />
              {dataSaverMode ? 'Disable Data Saver' : 'Enable Data Saver'}
            </DropdownMenu.Item>
            <DropdownMenu.Item
              onSelect={() => {
                setSettingMenuOpen(true);
              }}
            >
              <Icon type='cog' className='mr-2' />
              Settings
            </DropdownMenu.Item>
            <DropdownMenu.Item
              className='md:hidden'
              onSelect={() => {
                setParticipantsMenuOpen(true);
              }}
            >
              <Icon type='userGroup' className='mr-2' />
              {participantCount(otherUsers.length + 1)}
            </DropdownMenu.Item>
            <DropdownMenu.Arrow />
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      {settingsMenuOpen && <SettingsDialog open={settingsMenuOpen} onOpenChange={setSettingMenuOpen} />}
      {participantsMenuOpen && (
        <ParticipantsDialog
          otherUsers={otherUsers}
          identity={identity}
          open={participantsMenuOpen}
          onOpenChange={setParticipantsMenuOpen}
        />
      )}
    </>
  );
};
