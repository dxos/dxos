//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';

import { IconButton, type ThemedClassName, Toolbar, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

import { useSubscribedState, useCallContext } from '../../hooks';
import { CALLS_PLUGIN } from '../../meta';
import { MediaButtons, VideoObject } from '../Media';
import { ResponsiveGridItemContainer } from '../ResponsiveGrid';

export const Lobby: FC<ThemedClassName> = ({ classNames }) => {
  const { t } = useTranslation(CALLS_PLUGIN);
  const { call, userMedia, peer, setJoined } = useCallContext()!;
  const session = useSubscribedState(peer.session$);
  const sessionError = useSubscribedState(peer.sessionError$);
  const numUsers = new Set(call.room.users?.filter((user) => user.tracks?.audio).map((user) => user.name)).size;

  return (
    <div className={mx('flex flex-col grow overflow-hidden', classNames)}>
      <ResponsiveGridItemContainer>
        <VideoObject flip muted videoTrack={userMedia.videoTrack} />
      </ResponsiveGridItemContainer>
      <Toolbar.Root classNames='justify-between'>
        <IconButton
          variant='primary'
          label={t('join call')}
          onClick={() => setJoined(true)}
          disabled={!session?.sessionId}
          icon='ph--phone-incoming--regular'
        />
        <div className='grow text-sm text-subdued'>
          {sessionError ?? `${numUsers} ${numUsers === 1 ? 'participant' : 'participants'}`}
        </div>
        <MediaButtons userMedia={userMedia} />
      </Toolbar.Root>
    </div>
  );
};

Lobby.displayName = 'Lobby';
