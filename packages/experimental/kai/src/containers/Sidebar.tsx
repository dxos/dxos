//
// Copyright 2022 DXOS.org
//

import clsx from 'clsx';
import { Bug, ShareNetwork, PlusCircle, Trash } from 'phosphor-react';
import React, { useEffect, useState } from 'react';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { Link, useHref, useNavigate, useParams } from 'react-router-dom';

import { Invitation, CancellableInvitationObservable, InvitationEncoder } from '@dxos/client';
import { PublicKey } from '@dxos/keys';
import { useClient, useSpaces } from '@dxos/react-client';
import { getSize } from '@dxos/react-ui';

import { useSpace } from '../hooks';

export const Sidebar = () => {
  const { spaceKey: currentSpaceKey } = useParams();
  const navigate = useNavigate();
  const client = useClient();
  const spaces = useSpaces();
  const { space } = useSpace();
  const [observable, setObservable] = useState<CancellableInvitationObservable>();

  useEffect(() => {
    const swarmKey = PublicKey.random();
    const observable = space.createInvitation({
      swarmKey,
      type: Invitation.Type.MULTIUSE_TESTING
    });

    const unsubscribe = observable.subscribe({
      onConnecting: () => {
        setObservable(observable);
      },
      onConnected: () => {},
      onSuccess: () => {},
      onError: (error) => {
        console.error(error);
      }
    });

    return () => {
      unsubscribe();
      void observable.cancel();
      setObservable(undefined);
    };
  }, [space]);

  // TODO(burdon): Constant re-render after connected: space updated?
  const url = useHref(observable ? `/join/${InvitationEncoder.encode(observable.invitation!)}` : '/');
  console.log('URL', url);

  const handleCreateSpace = async () => {
    const space = await client.echo.createSpace();
    navigate(`/${space.key.truncate()}`);
  };

  const handleReset = () => {
    console.log('reset');
  };

  return (
    <div className='flex flex-1 flex-col bg-slate-700 text-white'>
      <div className='flex p-3 mb-2'>
        <div className='flex flex-1 items-center'>
          <Bug className={getSize(8)} style={{ transform: 'rotate(300deg)' }} />
          <div className='flex-1'></div>
          <button className='flex' onClick={handleCreateSpace}>
            <PlusCircle className={getSize(6)} />
          </button>
        </div>
      </div>

      <div className='flex flex-1 flex-col font-mono cursor-pointer'>
        {spaces.map((space) => (
          <div
            key={space.key.toHex()}
            className={clsx('flex p-2 pl-4 pr-4', space.key.truncate() === currentSpaceKey && 'bg-slate-600')}
          >
            <div className='flex flex-1'>
              <Link to={`/${space.key.truncate()}`}>{space.key.truncate()}</Link>
            </div>
            {space.key.truncate() === currentSpaceKey && (
              <div className='flex items-center'>
                <CopyToClipboard text={window.origin + '/' + url}>
                  <ShareNetwork className={clsx(getSize(5), 'cursor-pointer')} />
                </CopyToClipboard>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className='flex p-3 mt-2'>
        <button title='Reset store.' onClick={handleReset}>
          <Trash className={getSize(6)} />
        </button>
      </div>
    </div>
  );
};
