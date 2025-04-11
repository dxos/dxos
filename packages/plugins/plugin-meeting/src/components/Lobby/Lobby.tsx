//
// Copyright 2024 DXOS.org
//

import React, { type FC, useCallback, useEffect, useState } from 'react';

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
  onJoin?: () => void;
};

export const Lobby: FC<LobbyProps> = ({ classNames, roomId, onJoin }) => {
  const { t } = useTranslation(MEETING_PLUGIN);
  const call = useCapability(MeetingCapabilities.CallManager);
  const [count, setCount] = useState<number>();

  const joinSound = useSoundEffect('JoinCall');
  const handleJoin = useCallback(async () => {
    try {
      if (call.joined) {
        await call.leave();
      }
      call.setRoomId(roomId);
      await Promise.all([call.join(), joinSound.play()]);
      onJoin?.();
    } catch (err) {
      log.catch(err);
    }
  }, [joinSound, roomId, call.joined, call, onJoin]);

  // TODO(wittjosiah): Leaving the room doesn't remove you from the swarm.
  useEffect(() => {
    void call.peek(roomId).then((count) => setCount(count));
    const interval = setInterval(() => {
      void call.peek(roomId).then((count) => setCount(count));
    }, 1000);
    return () => clearInterval(interval);
  }, [call, roomId]);

  return (
    <div className={mx('flex flex-col w-full h-full overflow-hidden', classNames)}>
      <ResponsiveContainer>
        <VideoObject flip muted videoStream={call.media.videoStream} />
      </ResponsiveContainer>

      <Toolbar.Root classNames='justify-between'>
        <IconButton variant='primary' label={t('join call')} onClick={handleJoin} icon='ph--phone-incoming--regular' />
        {count !== undefined && <div className='text-sm text-subdued'>{t('lobby participants', { count })}</div>}
        <Toolbar.Separator variant='gap' />
        <MediaButtons />
      </Toolbar.Root>
    </div>
  );
};

Lobby.displayName = 'Lobby';
