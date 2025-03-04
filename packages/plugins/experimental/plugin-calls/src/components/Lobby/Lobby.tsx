//
// Copyright 2024 DXOS.org
//

import React, { type FC, useCallback } from 'react';

import { IconButton, type ThemedClassName, Toolbar, useTranslation } from '@dxos/react-ui';
import { useSoundEffect } from '@dxos/react-ui-sfx';
import { mx } from '@dxos/react-ui-theme';

import { useCallContext } from '../../hooks';
import { CALLS_PLUGIN } from '../../meta';
import { MediaButtons, VideoObject } from '../Media';
import { ResponsiveContainer } from '../ResponsiveGrid';

export const Lobby: FC<ThemedClassName> = ({ classNames }) => {
  const { t } = useTranslation(CALLS_PLUGIN);
  const { call, userMedia, peer, setJoined } = useCallContext()!;
  const session = peer?.session;
  const sessionError = peer?.sessionError;
  const numUsers = call.room.users?.filter((user) => user.joined).length ?? 0;

  const joinSound = useSoundEffect('JoinCall');
  const handleJoin = useCallback(() => {
    setJoined(true);
    void joinSound.play();
  }, [setJoined, joinSound]);

  return (
    <div className={mx('flex flex-col w-full h-full overflow-hidden', classNames)}>
      <ResponsiveContainer>
        <VideoObject flip muted videoTrack={userMedia.state.videoTrack} />
      </ResponsiveContainer>

      <Toolbar.Root classNames='justify-between'>
        <IconButton
          variant='primary'
          label={t('join call')}
          onClick={handleJoin}
          disabled={!session?.sessionId}
          icon='ph--phone-incoming--regular'
        />
        <div className='grow text-sm text-subdued'>
          {sessionError ?? `${numUsers} ${numUsers === 1 ? t('lobby participant') : t('lobby participants')}`}
        </div>
        <MediaButtons userMedia={userMedia} />
      </Toolbar.Root>
    </div>
  );
};

Lobby.displayName = 'Lobby';
