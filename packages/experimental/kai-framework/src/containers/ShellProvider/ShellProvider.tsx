//
// Copyright 2023 DXOS.org
//

import React, { FC, PropsWithChildren } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { ShellProvider as NaturalShellProvider } from '@dxos/react-shell';

import { createPath, defaultFrameId, useAppRouter } from '../../hooks';

/**
 * Renders the DXOS shell and provides a way to set the layout of the shell from the rest of the app.
 */
export const ShellProvider: FC<PropsWithChildren<{}>> = ({ children }) => {
  const { space, frame, objectId } = useAppRouter();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const spaceInvitationCode = searchParams.get('spaceInvitationCode');
  const deviceInvitationCode = searchParams.get('deviceInvitationCode');

  return (
    // TODO(wittjosiah): Make this easier to use directly in Root. Need access to space/frame.
    <NaturalShellProvider
      space={space}
      deviceInvitationCode={deviceInvitationCode}
      spaceInvitationCode={spaceInvitationCode}
      onJoinedSpace={(spaceKey) =>
        spaceKey && navigate(createPath({ spaceKey, frame: frame?.module.id ?? defaultFrameId, objectId }))
      }
    >
      {children}
    </NaturalShellProvider>
  );
};
