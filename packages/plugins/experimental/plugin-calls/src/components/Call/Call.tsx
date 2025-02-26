//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren, type FC } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';
import { nonNullable } from '@dxos/util';

import { CallRoom } from './Room';
import { CallToolbar } from './Toolbar';
import { useCallContext } from '../../hooks';
import { AudioTrackContextProvider } from '../Media';

const CallRoot: FC<PropsWithChildren<ThemedClassName>> = ({ children, classNames }) => {
  const {
    call: { room, user: self },
  } = useCallContext();

  // Filter out self.
  const otherUsers = (room.users ?? []).filter((user) => user.id !== self.id);

  return (
    <AudioTrackContextProvider audioTracks={otherUsers.map((user) => user.tracks?.audio).filter(nonNullable)}>
      <div className={mx('flex flex-col w-full h-full overflow-hidden', classNames)}>{children}</div>
    </AudioTrackContextProvider>
  );
};

export const Call = {
  Root: CallRoot,
  Room: CallRoom,
  Toolbar: CallToolbar,
};
