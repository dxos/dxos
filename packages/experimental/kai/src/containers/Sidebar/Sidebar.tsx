//
// Copyright 2022 DXOS.org
//

import clipboardCopy from 'clipboard-copy';
import { PlusCircle, ArrowCircleDownLeft, CaretLeft } from 'phosphor-react';
import React, { useContext, useEffect, useState } from 'react';
import { useHref, useNavigate } from 'react-router-dom';

import { CancellableInvitationObservable, Invitation, PublicKey, ShellLayout } from '@dxos/client';
import { log } from '@dxos/log';
import { useClient, useMembers, useSpaces } from '@dxos/react-client';
import { Button, getSize, mx } from '@dxos/react-components';
import { PanelSidebarContext, useTogglePanelSidebar } from '@dxos/react-ui';

import {
  useAppState,
  useTheme,
  useShell,
  createInvitationPath,
  useAppRouter,
  createPath,
  defaultFrameId
} from '../../hooks';
import { MemberList } from '../MembersList';
import { SpaceList } from '../SpaceList';
import { Actions } from './Actions';

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
  const { dev } = useAppState();

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

  const handleSelectSpace = (spaceKey: PublicKey) => {
    navigate(createPath({ spaceKey, frame: frame?.module.id }));
  };

  const handleShareSpace = (spaceKey: PublicKey) => {
    if (dev && space) {
      // TODO(burdon): Cancel/remove.
      const swarmKey = PublicKey.random();
      const observable = space.createInvitation({
        swarmKey,
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

      return;
    }

    void shell.setLayout(ShellLayout.CURRENT_SPACE, { spaceKey: space?.key });
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
          <SpaceList spaces={spaces} selected={space?.key} onSelect={handleSelectSpace} onShare={handleShareSpace} />
        </div>

        <div className='flex-1' />

        {/* Members */}
        <div className='flex flex-col shrink-0 my-4'>
          <div className='flex shrink-0'>
            <MemberList identityKey={client.halo.identity!.identityKey} members={members} />
          </div>
        </div>

        {/* TODO(burdon): Move some actions to menu. */}
        <Actions />
      </div>
    </div>
  );
};
