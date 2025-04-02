//
// Copyright 2024 DXOS.org
//

import React, { type FC } from 'react';

import { useCapability } from '@dxos/app-framework';
import { type ThemedClassName } from '@dxos/react-ui';

import { MeetingCapabilities } from '../../capabilities';
import { useDebugMode } from '../../hooks';
import { ParticipantGrid } from '../Participant';

/**
 * Meeting component.
 */
export const CallRoom: FC<ThemedClassName> = ({ classNames }) => {
  const debug = useDebugMode();
  const call = useCapability(MeetingCapabilities.CallManager);

  return <ParticipantGrid self={call.self} users={call.users} debug={debug} />;
};

CallRoom.displayName = 'CallRoom';
