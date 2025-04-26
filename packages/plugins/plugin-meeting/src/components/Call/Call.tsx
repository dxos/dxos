//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren, type FC } from 'react';

import { useCapability } from '@dxos/app-framework';
import { type ThemedClassName } from '@dxos/react-ui';

import { MeetingCapabilities } from '../../capabilities';
import { useDebugMode } from '../../hooks';
import { type MeetingType } from '../../types';
import { AudioStream } from '../Media';
import { MeetingToolbar } from '../MeetingToolbar';
import { ParticipantGrid } from '../Participant';

//
// Root
//

type CallRootProps = PropsWithChildren<ThemedClassName>;

const CallRoot: FC<CallRootProps> = ({ children }) => {
  return <div className='flex flex-col grow overflow-hidden'>{children}</div>;
};

CallRoot.displayName = 'CallRoot';

//
// Audio
//

type CallAudioProps = {};

const CallAudio: FC<CallAudioProps> = () => {
  const call = useCapability(MeetingCapabilities.CallManager);

  return <AudioStream tracks={call.pulledAudioTracks} />;
};

CallAudio.displayName = 'CallAudio';

//
// Room
//

type CallRoomProps = {};

const CallRoom: FC<CallRoomProps> = () => {
  const debug = useDebugMode();
  const call = useCapability(MeetingCapabilities.CallManager);

  return <ParticipantGrid self={call.self} users={call.users} debug={debug} />;
};

CallRoom.displayName = 'CallRoom';

//
// Toolbar
//

type CallToolbarProps = {
  roomId?: string;
  meeting?: MeetingType;
  onLeave?: () => void;
};

const CallToolbar: FC<CallToolbarProps> = ({ roomId, meeting, onLeave }) => {
  return <MeetingToolbar roomId={roomId} meeting={meeting} onLeave={onLeave} />;
};

CallToolbar.displayName = 'CallToolbar';

//
// Export
//

export const Call = {
  Root: CallRoot,
  Audio: CallAudio,
  Room: CallRoom,
  Toolbar: CallToolbar,
};
