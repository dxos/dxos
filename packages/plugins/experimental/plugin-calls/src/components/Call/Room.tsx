//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';

import { type ThemedClassName } from '@dxos/react-ui';

import { useCallGlobalContext, useDebugMode } from '../../hooks';
import { ParticipantGrid } from '../Participant';

/**
 * Meeting component.
 */
export const CallRoom: FC<ThemedClassName> = ({ classNames }) => {
  const debug = useDebugMode();
  const {
    call: { users, self },
  } = useCallGlobalContext();

  return <ParticipantGrid self={self} users={users} debug={debug} />;
};

CallRoom.displayName = 'CallRoom';
