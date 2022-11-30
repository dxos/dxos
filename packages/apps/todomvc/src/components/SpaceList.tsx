//
// Copyright 2022 DXOS.org
//

import cx from 'classnames';
import React, { useCallback, useEffect, useState } from 'react';
import { useParams, Outlet, useNavigate, Link } from 'react-router-dom';

import { InvitationEncoder, Item, ObjectModel } from '@dxos/client';
import { useClient, useIdentity, useSelection, useSpace, useSpaces } from '@dxos/react-client';
import { humanize } from '@dxos/util';

import { LIST_TYPE } from '../model';

export const SpaceList = () => {
  const client = useClient();
  const identity = useIdentity();
  const spaces = useSpaces();
  const { space: spaceHex } = useParams();
  const navigate = useNavigate();
  const space = useSpace(spaceHex);
  const [item] = useSelection<Item<ObjectModel>>(space?.database.select({ type: LIST_TYPE })) ?? [];
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
    await space.database.createItem({
      model: ObjectModel,
      type: LIST_TYPE
    });
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
        console.log(invitation.spaceKey!.toHex());
        navigate(`/${invitation.spaceKey!.toHex()}`);
      },
      onError: (err) => console.error(err)
    });
  }, [inviteCode, setInviteCode, client]);

  return (
    <>
      <button id='open' onClick={() => setShow(true)}>
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
          <input onChange={(ev) => setInviteCode(ev.target.value)} placeholder='Invite Code' className='flex-grow' />
          <button id='join' onClick={handleJoin}>
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
      <section className='todoapp'>{space && item && <Outlet context={{ space, item }} />}</section>
    </>
  );
};
