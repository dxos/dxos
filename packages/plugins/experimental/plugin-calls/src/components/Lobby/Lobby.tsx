//
// Copyright 2024 DXOS.org
//

import React, { type FC, useCallback } from 'react';

import { type PublicKey } from '@dxos/keys';
import { IconButton, type ThemedClassName, Toolbar, useTranslation } from '@dxos/react-ui';
import { useSoundEffect } from '@dxos/react-ui-sfx';
import { mx } from '@dxos/react-ui-theme';

import { useCallContext, useCallGlobalContext } from '../../hooks';
import { CALLS_PLUGIN } from '../../meta';
import { MediaButtons, VideoObject } from '../Media';
import { ResponsiveContainer } from '../ResponsiveGrid';

export const Lobby: FC<ThemedClassName & { roomId: PublicKey }> = ({ classNames, roomId }) => {
  const { t } = useTranslation(CALLS_PLUGIN);
  const { call } = useCallGlobalContext();
  const { userMedia, peer } = useCallContext()!;
  const session = peer?.session;
  const sessionError = peer?.sessionError;
  const numUsers = call.users?.filter((user) => user.joined).length ?? 0;

  const joinSound = useSoundEffect('JoinCall');
  const handleJoin = useCallback(async () => {
    await call.join(roomId);
    await joinSound.play();
  }, [joinSound, roomId]);

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
