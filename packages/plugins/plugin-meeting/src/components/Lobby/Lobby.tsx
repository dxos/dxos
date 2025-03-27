//
// Copyright 2024 DXOS.org
//

import React, { type FC, useCallback } from 'react';

import { useCapability } from '@dxos/app-framework';
import { log } from '@dxos/log';
import { IconButton, type ThemedClassName, Toolbar, useTranslation } from '@dxos/react-ui';
import { useSoundEffect } from '@dxos/react-ui-sfx';
import { mx } from '@dxos/react-ui-theme';

import { MeetingCapabilities } from '../../capabilities';
import { MEETING_PLUGIN } from '../../meta';
import { MediaButtons, VideoObject } from '../Media';
import { ResponsiveContainer } from '../ResponsiveGrid';

type LobbyProps = ThemedClassName & {
  roomId: string;
};

export const Lobby: FC<LobbyProps> = ({ classNames, roomId }) => {
  const { t } = useTranslation(MEETING_PLUGIN);
  const call = useCapability(MeetingCapabilities.CallManager);
  // const sessionError = call.media.peer?.sessionError;
  // TODO(mykola): Users number is not correct now, we are joining swarm on press of join button.
  // So we can not scan users list before joining.
  // const numUsers = call.users?.filter((user) => user.joined).length ?? 0;

  const joinSound = useSoundEffect('JoinCall');
  const handleJoin = useCallback(async () => {
    try {
      if (call.joined) {
        await call.leave();
      }
      call.setRoomId(roomId);
      await Promise.all([call.join(), joinSound.play()]);
    } catch (err) {
      log.catch(err);
    }
  }, [joinSound, roomId, call.joined, call.leave, call.setRoomId, call.join]);

  return (
    <div className={mx('flex flex-col w-full h-full overflow-hidden', classNames)}>
      <ResponsiveContainer>
        <VideoObject flip muted videoStream={call.media.videoStream} />
      </ResponsiveContainer>

      <Toolbar.Root classNames='justify-between'>
        <IconButton variant='primary' label={t('join call')} onClick={handleJoin} icon='ph--phone-incoming--regular' />
        {/* <div className='grow text-sm text-subdued'>
          {sessionError ?? `${numUsers} ${numUsers === 1 ? t('lobby participant') : t('lobby participants')}`}
        </div> */}
        <MediaButtons />
      </Toolbar.Root>
    </div>
  );
};

Lobby.displayName = 'Lobby';
