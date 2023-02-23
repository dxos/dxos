//
// Copyright 2022 DXOS.org
//

import assert from 'assert';
import clipboardCopy from 'clipboard-copy';
import { ArrowCircleDownLeft, CaretLeft, PlusCircle, WifiHigh, WifiSlash } from 'phosphor-react';
import React, { useContext, useEffect, useState } from 'react';
import { useHref, useNavigate } from 'react-router-dom';

import { CancellableInvitationObservable, Invitation, PublicKey, ShellLayout } from '@dxos/client';
import { log } from '@dxos/log';
import { ConnectionState } from '@dxos/protocols/proto/dxos/client/services';
import { AuthMethod } from '@dxos/protocols/proto/dxos/halo/invitations';
import { useClient, useMembers, useNetworkStatus, useSpaces } from '@dxos/react-client';
import { Button, getSize, mx } from '@dxos/react-components';
import { PanelSidebarContext, useTogglePanelSidebar } from '@dxos/react-ui';

import { createInvitationPath, createPath, defaultFrameId, useAppRouter, useShell, useTheme } from '../../hooks';
import { Intent, IntentAction } from '../../util';
import { MemberList } from '../MembersList';
import { SpaceList, SpaceListAction } from '../SpaceList';

export const Sidebar = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const client = useClient();
  const { space, frame } = useAppRouter();
  const spaces = useSpaces();
  const members = useMembers(space?.key);
  const shell = useShell();
  const [prevSpace, setPrevSpace] = useState(space);
  const toggleSidebar = useTogglePanelSidebar();
  const { displayState } = useContext(PanelSidebarContext);
  const isOpen = displayState === 'show';
  const { state: connectionState } = useNetworkStatus();

  const [observable, setObservable] = useState<CancellableInvitationObservable>();
  const href = useHref(observable ? createInvitationPath(observable.invitation!) : '/');
  useEffect(() => {
    // TODO(burdon): Unsubscribe.
    return () => {
      void observable?.cancel();
    };
  }, []);

  useEffect(() => {
    if (observable) {
      const url = new URL(href, window.origin);
      void clipboardCopy(url.toString());
    }
  }, [observable]);

  // TODO(wittjosiah): Find a better way to do this.
  if (prevSpace !== space) {
    setPrevSpace(space);
  }

  const handleCreateSpace = async () => {
    const space = await client.echo.createSpace();
    navigate(createPath({ spaceKey: space.key, frame: defaultFrameId }));
  };

  const handleJoinSpace = () => {
    void shell.setLayout(ShellLayout.JOIN_SPACE, { spaceKey: space?.key });
  };

  const handleSpaceListAction = (intent: Intent<SpaceListAction>) => {
    const space = spaces.find(({ key }) => key.equals(intent.data.spaceKey));
    assert(space);

    switch (intent.action) {
      case IntentAction.SPACE_SELECT: {
        navigate(createPath({ spaceKey: intent.data.spaceKey, frame: frame?.module.id }));
        break;
      }

      case IntentAction.SPACE_SHARE: {
        if (intent.data.modifier) {
          const swarmKey = PublicKey.random();
          const observable = space.createInvitation({
            swarmKey,
            authMethod: AuthMethod.NONE,
            type: Invitation.Type.MULTIUSE_TESTING
          });

          const unsubscribe = observable.subscribe({
            onConnecting: () => {
              setObservable(observable);
              unsubscribe();
            },
            onConnected: () => {},
            onSuccess: () => {},
            onError: (error) => {
              log.error(error);
              unsubscribe();
            }
          });
        } else {
          void shell.setLayout(ShellLayout.SPACE_INVITATIONS, { spaceKey: intent.data.spaceKey });
        }

        break;
      }
    }
  };

  const handleToggleConnection = async () => {
    switch (connectionState) {
      case ConnectionState.OFFLINE: {
        await client.mesh.setConnectionState(ConnectionState.ONLINE);
        break;
      }
      case ConnectionState.ONLINE: {
        await client.mesh.setConnectionState(ConnectionState.OFFLINE);
        break;
      }
    }
  };

  // TODO(burdon): Mobile slider (full width, no blur).
  return (
    <div
      role='none'
      className={mx('flex flex-col overflow-auto min-bs-full bg-sidebar-bg', theme.panel === 'flat' && 'border-r')}
    >
      {/* Match Frame selector. */}
      <div
        className={mx('flex flex-col-reverse h-toolbar', theme.classes?.toolbar, theme.panel === 'flat' && 'border-b')}
      >
        <div className='flex justify-between px-2'>
          <div className='flex items-center'>
            {/* TODO(burdon): Remove initial focus. */}
            <Button variant='ghost' className='flex' title='Create new space' onClick={handleCreateSpace}>
              <span className='sr-only'>Create new space</span>
              <PlusCircle className={getSize(6)} />
            </Button>
            <Button variant='ghost' className='flex' title='Join a space' onClick={handleJoinSpace}>
              <span className='sr-only'>Join a space</span>
              <ArrowCircleDownLeft className={getSize(6)} />
            </Button>
          </div>
          <div className='flex items-center'>
            <Button variant='ghost' onClick={toggleSidebar}>
              {isOpen && <CaretLeft className={getSize(6)} />}
            </Button>
          </div>
        </div>
      </div>

      <div className='flex flex-col flex-1 overflow-hidden'>
        {/* Spaces */}
        <div className='flex overflow-y-auto'>
          <SpaceList spaces={spaces} selected={space?.key} onAction={handleSpaceListAction} />
        </div>

        <div className='flex-1' />

        {/* Members */}
        <div className='flex flex-col shrink-0 my-4'>
          <MemberList identityKey={client.halo.identity!.identityKey} members={members} />
          <div role='separator' className='bs-px bg-neutral-400/20 mlb-2 mli-2' />
          <Button variant='ghost' onClick={handleToggleConnection} className='justify-start mli-2'>
            {connectionState === ConnectionState.ONLINE ? (
              <WifiHigh className={getSize(5)} />
            ) : (
              <WifiSlash className={mx(getSize(5), 'text-selection-text')} />
            )}
            <span className='mis-2'>Toggle connection</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
