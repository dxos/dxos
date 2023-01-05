//
// Copyright 2022 DXOS.org
//

import { Planet, ShareNetwork } from 'phosphor-react';
import React, { useEffect, useState } from 'react';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { Link, useHref, useParams } from 'react-router-dom';

import { Invitation, CancellableInvitationObservable, InvitationEncoder } from '@dxos/client';
import { PublicKey } from '@dxos/keys';
import { useSpaces } from '@dxos/react-client';
import { getSize, mx } from '@dxos/react-ui';

import { Button } from '../components';
import { useSpace } from '../hooks';

export const SpaceList = () => {
  const { spaceKey: currentSpaceKey, view } = useParams();
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

  return (
    <div className='flex flex-col'>
      {spaces.map((space) => (
        <div
          key={space.key.toHex()}
          className={mx('flex p-2 pl-3 pr-4 items-center', space.key.truncate() === currentSpaceKey && 'bg-slate-600')}
        >
          <div className={mx('mr-3', space.key.truncate() === currentSpaceKey ? 'text-orange-500' : 'text-slate-500')}>
            <Planet className={getSize(6)} />
          </div>
          <div className='flex flex-1 font-mono text-slate-300 cursor-pointer'>
            <Link to={`/${space.key.truncate()}/${view}`}>{space.key.truncate()}</Link>
          </div>
          {space.key.truncate() === currentSpaceKey && (
            <div className='flex items-center'>
              <CopyToClipboard text={window.origin + '/' + url}>
                <Button>
                  <ShareNetwork className={mx(getSize(5), 'cursor-pointer')} />
                </Button>
              </CopyToClipboard>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
