//
// Copyright 2022 DXOS.org
//

import clipboardCopy from 'clipboard-copy';
import { PlusCircle, ArrowCircleDownLeft } from 'phosphor-react';
import React, { useEffect, useState } from 'react';
import { useHref, useNavigate, useParams } from 'react-router-dom';

import { CancellableInvitationObservable, Invitation, PublicKey } from '@dxos/client';
import { log } from '@dxos/log';
import { useClient, useMembers, useSpaces } from '@dxos/react-client';
import { getSize } from '@dxos/react-components';

import { Button, MemberList, SpaceList } from '../components';
import { useSpace, createSpacePath, FrameID, useAppState, createInvitationPath } from '../hooks';
import { Actions } from './Actions';

export const Sidebar = () => {
  const { frame, view } = useParams();
  const navigate = useNavigate();
  const client = useClient();
  const space = useSpace();
  const spaces = useSpaces();
  const members = useMembers(space.key);
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
    navigate(createSpacePath(space.key));
  };

  const handleJoinSpace = async () => {
    navigate('/space/join');
  };

  const handleSelectSpace = (spaceKey: PublicKey) => {
    navigate(createSpacePath(spaceKey, frame));
  };

  const handleShareSpace = (spaceKey: PublicKey) => {
    if (dev) {
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

    navigate(createSpacePath(spaceKey, FrameID.SETTINGS));
  };

  return (
    <div
      role='none'
      className='flex flex-col overflow-auto min-bs-full box-shadow backdrop-blur bg-neutral-50/[.33] dark:bg-neutral-950/[.33]'
    >
      {/* Match Frame selector. */}
      <div className='flex flex-col-reverse h-framepicker bg-orange-500'>
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
          <SpaceList value={space.key} spaces={spaces} onSelect={handleSelectSpace} onShare={handleShareSpace} />
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
