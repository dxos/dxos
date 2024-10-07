//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';

import AlertDialog from './AlertDialog';
import type { ButtonProps } from './Button';
import { Button } from './Button';
import { Icon } from './Icon/Icon';
import { Tooltip } from './Tooltip';
import { useRoomContext } from '../hooks/useRoomContext';
import { useUserMetadata } from '../hooks/useUserMetadata';
import type { ClientMessage, User } from '../types/Messages';

interface MuteUserButtonProps {
  displayType?: ButtonProps['displayType'];
  mutedDisplayType?: ButtonProps['displayType'];
  user: User;
}

export const MuteUserButton: FC<MuteUserButtonProps> = ({
  user,
  displayType = 'secondary',
  mutedDisplayType = 'danger',
}) => {
  const { room } = useRoomContext();
  const { data } = useUserMetadata(user.name);
  return (
    <AlertDialog.Root>
      {user.tracks.audioEnabled ? (
        <Tooltip content={`Mute ${data?.displayName}`}>
          <AlertDialog.Trigger asChild>
            <Button displayType={displayType} disabled={!user.tracks.audioEnabled}>
              <Icon type='micOn' />
            </Button>
          </AlertDialog.Trigger>
        </Tooltip>
      ) : (
        <Tooltip content='Cannot unmute'>
          <Button displayType={mutedDisplayType} disabled>
            <Icon type='micOff' />
          </Button>
        </Tooltip>
      )}

      <AlertDialog.Portal>
        <AlertDialog.Overlay />
        <AlertDialog.Content
          // If we don't prevent the alert from restoring focus the tooltip
          // will continue to show when we don't want it to.
          onCloseAutoFocus={(e) => e.preventDefault()}
        >
          <AlertDialog.Title>Mute {data?.displayName}</AlertDialog.Title>
          <AlertDialog.Description>They will need to unmute themselves to be heard again.</AlertDialog.Description>
          <AlertDialog.Actions>
            <AlertDialog.Cancel asChild>
              <Button className='text-sm' displayType='secondary'>
                Cancel
              </Button>
            </AlertDialog.Cancel>
            <AlertDialog.Action asChild>
              <Button
                onClick={() => {
                  room.websocket.send(
                    JSON.stringify({
                      type: 'muteUser',
                      id: user.id,
                    } satisfies ClientMessage),
                  );
                }}
                className='text-sm'
                displayType='danger'
              >
                Mute
              </Button>
            </AlertDialog.Action>
          </AlertDialog.Actions>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
};
