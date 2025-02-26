//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';

import { useCallContext, useDebugMode } from '../../hooks';
import { ParticipantGrid } from '../Participant';

/**
 * Meeting component.
 */
export const CallRoom: FC<ThemedClassName> = ({ classNames }) => {
  const debug = useDebugMode();
  const {
    call: { room, user: self },
  } = useCallContext();

  // Filter out self.
  const otherUsers = (room.users ?? []).filter((user) => user.id !== self.id);

  return <ParticipantGrid user={self} users={otherUsers} debug={debug} />;
};

CallRoom.displayName = 'CallRoom';
