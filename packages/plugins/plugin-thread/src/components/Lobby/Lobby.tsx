//
// Copyright 2024 DXOS.org
//

import React, { type FC, type PropsWithChildren, useEffect, useState } from 'react';

import { useCapability } from '@dxos/app-framework/react';
import { type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { ThreadCapabilities } from '../../capabilities';
import { meta } from '../../meta';
import { Toolbar, type ToolbarProps } from '../Call';
import { VideoObject } from '../Media';
import { ResponsiveContainer } from '../ResponsiveGrid';

// TODO(wittjosiah): Repurpose lobby for preview.

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
  const { t } = useTranslation(meta.id);
  const call = useCapability(ThreadCapabilities.CallManager);
  const [classNames, setClassNames] = useState('');
  useEffect(() => {
    if (!call.media.videoEnabled) {
      setClassNames('');
      return;
    }

    // Video element will expand once the stream is available.
    const timeout = setTimeout(() => {
      setClassNames('outline-neutral-900 opacity-100');
    }, 500);

    return () => clearTimeout(timeout);
  }, [call.media.videoEnabled]);

  return (
    <div className='grid grow p-4'>
      <ResponsiveContainer>
        {(call.media.videoEnabled && (
          <VideoObject
            videoStream={call.media.videoStream}
            flip
            muted
            classNames={mx(
              'rounded-md outline outline-2 outline-transparent opacity-0 transition-all duration-500',
              classNames,
            )}
          />
        )) || <div className='p-4 outline outline-separator rounded-md'>{t('camera off label')}</div>}
      </ResponsiveContainer>
    </div>
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
  const call = useCapability(ThreadCapabilities.CallManager);
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
      <Toolbar participants={count} isInRoom={false} {...props} />
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
