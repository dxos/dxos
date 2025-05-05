//
// Copyright 2024 DXOS.org
//

import React, { type FC, type PropsWithChildren, useEffect, useState } from 'react';

import { useCapability } from '@dxos/app-framework';
import { type ThemedClassName } from '@dxos/react-ui';

import { MeetingCapabilities } from '../../capabilities';
import { VideoObject } from '../Media';
import { ResponsiveContainer } from '../ResponsiveGrid';
import { Toolbar, type ToolbarProps } from '../Toolbar';

const SWARM_PEEK_INTERVAL = 1_000;

//
// Root
//

type LobbyRootProps = PropsWithChildren<ThemedClassName>;

const LobbyRoot: FC<LobbyRootProps> = ({ children }) => {
  return <div className='flex flex-col grow overflow-hidden group'>{children}</div>;
};

LobbyRoot.displayName = 'LobbyRoot';

//
// Preview
//

type LobbyPreviewProps = {};

const LobbyPreview: FC<LobbyPreviewProps> = () => {
  const call = useCapability(MeetingCapabilities.CallManager);

  return (
    <ResponsiveContainer>
      <VideoObject flip muted videoStream={call.media.videoStream} />
    </ResponsiveContainer>
  );
};

LobbyPreview.displayName = 'LobbyPreview';

//
// Toolbar
//

type LobbyToolbarProps = ThemedClassName<
  {
    roomId: string;
  } & Pick<ToolbarProps, 'onJoin'>
>;

const LobbyToolbar: FC<LobbyToolbarProps> = ({ roomId, ...props }) => {
  const call = useCapability(MeetingCapabilities.CallManager);
  const [count, setCount] = useState<number>(0);

  // TODO(wittjosiah): Leaving the room doesn't remove you from the swarm.
  useEffect(() => {
    void call.peek(roomId).then((count) => setCount(count));
    const interval = setInterval(() => {
      void call.peek(roomId).then((count) => setCount(count));
    }, SWARM_PEEK_INTERVAL);

    return () => clearInterval(interval);
  }, [call, roomId]);

  return <Toolbar participants={count} {...props} />;
};

LobbyToolbar.displayName = 'LobbyToolbar';

//
// Export
//

export const Lobby = {
  Root: LobbyRoot,
  Preview: LobbyPreview,
  Toolbar: LobbyToolbar,
};
