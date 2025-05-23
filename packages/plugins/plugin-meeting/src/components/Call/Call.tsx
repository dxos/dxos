//
// Copyright 2025 DXOS.org
//

import React, { type PropsWithChildren, type FC } from 'react';

import { useCapability } from '@dxos/app-framework';
import { type ThemedClassName } from '@dxos/react-ui';

import { MeetingCapabilities } from '../../capabilities';
import { useDebugMode } from '../../hooks';
import { AudioStream } from '../Media';
import { ParticipantGrid } from '../Participant';
import { Toolbar, type ToolbarProps } from '../Toolbar';

//
// Root
//

type CallRootProps = PropsWithChildren<ThemedClassName>;

const CallRoot: FC<CallRootProps> = ({ children }) => {
  return <div className='relative flex flex-col grow overflow-hidden'>{children}</div>;
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

type CallGridProps = {
  fullscreen?: boolean;
};

const CallGrid: FC<CallGridProps> = ({ fullscreen }) => {
  const debug = useDebugMode();
  const call = useCapability(MeetingCapabilities.CallManager);

  return (
    <div className='grid grow p-4 dark:bg-neutral-900'>
      <ParticipantGrid self={call.self} users={call.users} debug={debug} fullscreen={fullscreen} />
    </div>
  );
};

CallGrid.displayName = 'CallGrid';

//
// Toolbar
//

type CallToolbarProps = Pick<ToolbarProps, 'meeting' | 'onLeave'>;

const CallToolbar: FC<CallToolbarProps> = (props) => {
  return (
    <div className='absolute bottom-0 left-0 right-0 flex justify-center'>
      <Toolbar {...props} />
    </div>
  );
};

CallToolbar.displayName = 'CallToolbar';

//
// Export
//

export const Call = {
  Root: CallRoot,
  Grid: CallGrid,
  Audio: CallAudio,
  Toolbar: CallToolbar,
};
