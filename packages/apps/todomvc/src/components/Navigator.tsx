//
// Copyright 2022 DXOS.org
//

import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useClient, useIdentity, useSpace, useSpaces, useSpaceSetter } from '@dxos/react-client';

import { TodoList } from '../proto';

export const Navigator = () => {
  const client = useClient();
  const identity = useIdentity();
  const spaces = useSpaces();
  const space = useSpace();
  const setSpace = useSpaceSetter();
  const { spaceKey } = useParams();
  const navigate = useNavigate();

  // Initialize identity and first space.
  useEffect(() => {
    if (!identity) {
      setTimeout(async () => {
        // TODO(wittjosiah): HALO onboarding overlay.
        await client.halo.createProfile();
        const space = await client.echo.createSpace();
        await space.experimental.db.save(new TodoList());
        setSpace(space);
      });
    }
  }, [identity]);

  // Navigate to selected spaces.
  useEffect(() => {
    if (!space && spaces.length > 0) {
      setSpace(spaces[0]);
    } else if (space && space.key.toHex() !== spaceKey) {
      navigate(`/${space.key.toHex()}`);
    }
  }, [space]);

  return null;
};
