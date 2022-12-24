//
// Copyright 2022 DXOS.org
//

import clsx from 'clsx';
import {
  AirplaneInFlight,
  AirplaneTakeoff,
  Bug,
  Planet,
  ShareNetwork,
  PlusCircle,
  Smiley,
  SmileyBlank,
  UserCircle
} from 'phosphor-react';
import React, { FC, useEffect, useState } from 'react';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { Link, useHref, useNavigate, useParams } from 'react-router-dom';

import { Invitation, CancellableInvitationObservable, InvitationEncoder, SpaceMember } from '@dxos/client';
import { PublicKey } from '@dxos/keys';
import { useClient, useMembers, useSpaces } from '@dxos/react-client';
import { getSize } from '@dxos/react-ui';

import { useSpace } from '../hooks';

export const Members: FC<{ spaceKey: PublicKey }> = ({ spaceKey }) => {
  const client = useClient();
  const members = useMembers(spaceKey);
  members.sort((a) => (a.identityKey.equals(client.halo.profile!.identityKey) ? -1 : 1));

  return (
    <div className='flex flex-1 flex-col'>
      {members.map((member) => (
        <div key={member.identityKey.toHex()} className='flex mb-1 items-center'>
          <div className='mr-3'>
            {member.identityKey.equals(client.halo.profile!.identityKey) ? (
              <UserCircle className={clsx(getSize(6), 'text-orange-500')} />
            ) : member.presence === SpaceMember.PresenceState.ONLINE ? (
              <Smiley className={clsx(getSize(6), 'text-green-500')} />
            ) : (
              <SmileyBlank className={clsx(getSize(6), 'text-slate-500')} />
            )}
          </div>
          <div className='font-mono text-slate-300'>{member.identityKey.truncate()}</div>
        </div>
      ))}
    </div>
  );
};

export const Sidebar = () => {
  const { spaceKey: currentSpaceKey } = useParams();
  const navigate = useNavigate();
  const client = useClient();
  const spaces = useSpaces();
  const { space } = useSpace();
  const [observable, setObservable] = useState<CancellableInvitationObservable>();
  const [airplaneMode, setAirplaneMode] = useState(false);

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

  const handleAirplaneMode = () => {
    setAirplaneMode((mode) => !mode);
  };

  return (
    <div className='flex flex-1 flex-col overflow-hidden bg-slate-700 text-white'>
      <div className='flex flex-shrink-0 p-3 mb-2'>
        <div className='flex flex-1 items-center'>
          <Bug className={clsx('logo', getSize(8))} />
          <div className='flex-1'></div>
          <button className='flex' onClick={handleCreateSpace}>
            <PlusCircle className={getSize(6)} />
          </button>
        </div>
      </div>

      <div className='flex flex-1 flex-col overflow-y-scroll'>
        {spaces.map((space) => (
          <div
            key={space.key.toHex()}
            className={clsx(
              'flex p-2 pl-3 pr-4 items-center',
              space.key.truncate() === currentSpaceKey && 'bg-slate-600'
            )}
          >
            <div
              className={clsx('mr-3', space.key.truncate() === currentSpaceKey ? 'text-orange-500' : 'text-slate-500')}
            >
              <Planet className={getSize(6)} />
            </div>
            <div className='flex flex-1 font-mono text-slate-300 cursor-pointer'>
              <Link to={`/${space.key.truncate()}`}>{space.key.truncate()}</Link>
            </div>
            {space.key.truncate() === currentSpaceKey && (
              <div className='flex items-center'>
                <CopyToClipboard text={window.origin + '/' + url}>
                  <button>
                    <ShareNetwork className={clsx(getSize(5), 'cursor-pointer')} />
                  </button>
                </CopyToClipboard>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className='flex flex-shrink-0 p-3 mt-6'>
        <Members spaceKey={space.key} />
      </div>

      <div className='flex flex-shrink-0 p-3 mt-2'>
        <button title='Reset store.' onClick={handleAirplaneMode}>
          {airplaneMode ? <AirplaneTakeoff className={getSize(6)} /> : <AirplaneInFlight className={getSize(6)} />}
        </button>
      </div>
    </div>
  );
};
