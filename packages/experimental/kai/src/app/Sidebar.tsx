//
// Copyright 2022 DXOS.org
//

import clipboardCopy from 'clipboard-copy';
import { PlusCircle, ArrowCircleDownLeft } from 'phosphor-react';
import React, { useEffect, useState } from 'react';
import { useHref, useParams } from 'react-router-dom';

import { CancellableInvitationObservable, Invitation, PublicKey, ShellLayout } from '@dxos/client';
import { log } from '@dxos/log';
import { useClient, useCurrentSpace, useMembers, useSpaces } from '@dxos/react-client';
import { getSize } from '@dxos/react-components';

import { Button, MemberList, SpaceList } from '../components';
import { useAppState, useShell } from '../hooks';
import { Actions } from './Actions';
import { createInvitationPath } from './router';

export const Sidebar = () => {
  const { view } = useParams();
  const client = useClient();
  const [space, setSpace] = useCurrentSpace();
  const spaces = useSpaces();
  const members = useMembers(space?.key);
  const shell = useShell();
  const [prevView, setPrevView] = useState(view);
  const [prevSpace, setPrevSpace] = useState(space);
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

  if (prevView !== view) {
    setPrevView(view);
  }

  const handleCreateSpace = async () => {
    const space = await client.echo.createSpace();
    setSpace(space.key);
  };

  const handleJoinSpace = async () => {
    shell.setLayout(ShellLayout.JOIN_SPACE, { spaceKey: space?.key });
  };

  const handleSelectSpace = (spaceKey: PublicKey) => {
    setSpace(spaceKey);
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

    shell.setLayout(ShellLayout.CURRENT_SPACE, { spaceKey: space?.key });
  };

  return (
    <div
      role='none'
      className='flex flex-col overflow-auto min-bs-full shadow backdrop-blur bg-neutral-50/[.33] dark:bg-neutral-950/[.33]'
    >
      {/* Match Frame selector. */}
      <div className='flex flex-col-reverse h-toolbar bg-orange-500'>
        <div className='flex justify-between items-center p-1 pl-4'>
          <div>Spaces</div>
          <div className='flex pr-3'>
            <Button />
            <Button className='flex ml-2' title='Create new space' onClick={handleCreateSpace}>
              <span className='sr-only'>Create new space</span>
              <PlusCircle className={getSize(6)} />
            </Button>
            <Button className='flex ml-2' title='Join a space' onClick={handleJoinSpace}>
              <span className='sr-only'>Join a space</span>
              <ArrowCircleDownLeft className={getSize(6)} />
            </Button>
          </div>
        </div>
      </div>

      <div className='flex flex-col flex-1'>
        {/* Spaces */}
        <div className='flex shrink-0 flex-col overflow-y-auto'>
          <SpaceList value={space?.key} spaces={spaces} onSelect={handleSelectSpace} onShare={handleShareSpace} />
        </div>

        <div className='flex-1' />

        {/* Members */}
        <div className='flex flex-col shrink-0 mt-6'>
          <div className='flex p-1 pl-3 mb-2 text-xs'>Members</div>
          <div className='flex shrink-0 pl-3'>
            <MemberList identityKey={client.halo.profile!.identityKey} members={members} />
          </div>
        </div>

        <Actions />
      </div>
    </div>
  );
};
