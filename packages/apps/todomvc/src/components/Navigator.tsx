//
// Copyright 2022 DXOS.org
//

import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useClient, useCurrentSpace, useIdentity, useSpaces } from '@dxos/react-client';

export const Navigator = () => {
  const client = useClient();
  const identity = useIdentity();
  const spaces = useSpaces();
  const [space, setSpace] = useCurrentSpace();
  const { spaceKey } = useParams();
  const navigate = useNavigate();

  // Navigate to selected spaces.
  useEffect(() => {
    if (!identity) {
      return;
    }

    const timeout = setTimeout(async () => {
      if (spaces.length === 0) {
        const space = await client.echo.createSpace();
        setSpace(space);
        navigate(`/${space.key.toHex()}`);
      } else if (!space) {
        setSpace(spaces[0]);
        navigate(`/${spaces[0].key.toHex()}`);
      } else if (space && space.key.toHex() !== spaceKey) {
        navigate(`/${space.key.toHex()}`);
      }
    });

    return () => clearTimeout(timeout);
  }, [identity, space]);

  return null;
};
