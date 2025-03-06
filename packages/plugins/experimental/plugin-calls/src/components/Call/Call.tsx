//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren, type FC } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { isNonNullable } from '@dxos/util';

import { CallRoom } from './Room';
import { CallToolbar } from './Toolbar';
import { useCallGlobalContext } from '../../hooks';
import { Lobby } from '../Lobby';
import { AudioTrackContextProvider } from '../Media';

const CallAudio: FC<PropsWithChildren<ThemedClassName>> = ({ children, classNames }) => {
  const {
    call: { users, self, joined },
  } = useCallGlobalContext();

  // Filter out self.
  const otherUsers = joined ? (users ?? []).filter((user) => user.id !== self?.id && user.joined) : [];

  return (
    <AudioTrackContextProvider audioTracks={otherUsers.map((user) => user.tracks?.audio).filter(isNonNullable)}>
      <div className={mx('flex flex-col w-full h-full overflow-hidden', classNames)}>{children}</div>
    </AudioTrackContextProvider>
  );
};

export const Call = {
  Audio: CallAudio,
  Room: CallRoom,
  Toolbar: CallToolbar,
  Lobby,
};
