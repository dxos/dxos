//
// Copyright 2024 DXOS.org
//

import React, { type FC, type PropsWithChildren, useEffect, useState } from 'react';

import { useCapability } from '@dxos/app-framework';
import { type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/react-ui-theme';

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
  return <div className='relative flex flex-col grow overflow-hidden group'>{children}</div>;
};

LobbyRoot.displayName = 'LobbyRoot';

//
// Preview
//

type LobbyPreviewProps = {};

const LobbyPreview: FC<LobbyPreviewProps> = () => {
  const call = useCapability(MeetingCapabilities.CallManager);
  const [classNames, setClassNames] = useState('');
  useEffect(() => {
    setClassNames('outline-primary-500');
  }, []);

  return (
    <ResponsiveContainer classNames='p-2'>
      <VideoObject
        flip
        muted
        videoStream={call.media.videoStream}
        classNames={mx('rounded outline outline-transparent transition-all duration-500', classNames)}
      />
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

  return (
    <div className='absolute bottom-0 left-0 right-0 flex justify-center'>
      <Toolbar participants={count} {...props} />
    </div>
  );
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
