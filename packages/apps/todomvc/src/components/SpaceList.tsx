//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import React, { useCallback, useEffect, useState } from 'react';
import { useParams, Outlet, useNavigate, Link } from 'react-router-dom';

import { InvitationEncoder } from '@dxos/client';
import { useClient, useIdentity, useSpace, useSpaces } from '@dxos/react-client';
import { humanize } from '@dxos/util';

import { TodoList } from '../proto';

export const SpaceList = () => {
  const client = useClient();
  const identity = useIdentity();
  const spaces = useSpaces();
  const { space: spaceHex } = useParams();
  const navigate = useNavigate();
  const space = useSpace(spaceHex);
  const [show, setShow] = useState(false);
  const [inviteCode, setInviteCode] = useState<string>();

  // Initialize identity and first space.
  useEffect(() => {
    if (!identity) {
      setTimeout(async () => {
        // TODO(wittjosiah): HALO onboarding overlay.
        await client.halo.createProfile();
        await handleCreateList();
      });
    }
  }, [identity]);

  // Navigate to a space if none are selected.
  useEffect(() => {
    if (!spaceHex && spaces.length > 0) {
      navigate(`/${spaces[0].key.toHex()}`);
    }
  }, [spaceHex, spaces]);

  const handleCreateList = useCallback(async () => {
    const space = await client.echo.createSpace();
    await space.experimental.db.save(new TodoList());
    navigate(`/${space.key.toHex()}`);
  }, [client, navigate]);

  const handleJoin = useCallback(async () => {
    if (!inviteCode) {
      return;
    }

    setInviteCode(undefined);
    const invitation = InvitationEncoder.decode(inviteCode);
    const observable = await client.echo.acceptInvitation(invitation);
    observable.subscribe({
      onSuccess: (invitation) => {
        navigate(`/${invitation.spaceKey!.toHex()}`);
      },
      onError: (err) => console.error(err)
    });
  }, [inviteCode, setInviteCode, client]);

  return (
    <>
      <button id='open' onClick={() => setShow(true)} data-testid='open-button'>
        ❯
      </button>
      <div id='spaces' className={cx(show && 'show')}>
        <div className='flex'>
          <h2>Spaces</h2>
          <div className='flex-grow'></div>
          <button id='add' onClick={handleCreateList}>
            +
          </button>
          <button id='close' onClick={() => setShow(false)}>
            ❯
          </button>
        </div>
        <div className='flex'>
          <input
            onChange={(ev) => setInviteCode(ev.target.value)}
            placeholder='Invite Code'
            className='flex-grow'
            data-testid='invitation-input'
          />
          <button id='join' onClick={handleJoin} data-testid='join-button'>
            Join
          </button>
        </div>
        <ul>
          {spaces.map((space) => {
            const key = space.key.toHex();
            return (
              <Link key={key} to={`/${key}`}>
                <li>{humanize(key)}</li>
              </Link>
            );
          })}
        </ul>
      </div>
      <section className='todoapp'>{space && <Outlet context={{ space }} />}</section>
    </>
  );
};
