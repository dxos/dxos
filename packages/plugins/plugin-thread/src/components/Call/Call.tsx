//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import React, { type FC, type PropsWithChildren } from 'react';

import { useCapability } from '@dxos/app-framework/react';
import { type ThemedClassName } from '@dxos/react-ui';

import { useDebugMode } from '../../hooks';
import { ThreadCapabilities } from '../../types';
import { AudioStream } from '../Media';
import { ParticipantGrid } from '../Participant';

import { Toolbar, type ToolbarProps } from './Toolbar';

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
  const call = useCapability(ThreadCapabilities.CallManager);
  const audioTracksToPlay = useAtomValue(call.audioTracksToPlayAtom);

  return <AudioStream tracks={audioTracksToPlay} />;
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
  const call = useCapability(ThreadCapabilities.CallManager);
  const self = useAtomValue(call.selfAtom);
  const users = useAtomValue(call.usersAtom);

  return (
    <div className='grid grow p-4 dark:bg-neutral-900'>
      <ParticipantGrid self={self} users={users} debug={debug} fullscreen={fullscreen} />
    </div>
  );
};

CallGrid.displayName = 'CallGrid';

//
// Toolbar
//

type CallToolbarProps = Pick<ToolbarProps, 'channel' | 'onLeave'>;

const CallToolbar: FC<CallToolbarProps> = (props) => {
  return (
    <div className='absolute bottom-0 left-0 right-0 flex justify-center'>
      <Toolbar isInRoom {...props} />
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
