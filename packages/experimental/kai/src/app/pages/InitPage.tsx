//
// Copyright 2022 DXOS.org
//

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useClient, useSpaces } from '@dxos/react-client';

/**
 * Selects or creates an initial space.
 */
export const InitPage = () => {
  const navigate = useNavigate();
  const client = useClient();
  const spaces = useSpaces();
  const [init, setInit] = useState(false);

  useEffect(() => {
    if (init) {
      return;
    }

    if (spaces.length) {
      navigate('/' + spaces[0].key.truncate());
    } else {
      setInit(true); // Make idempotent.
      setTimeout(async () => {
        const space = await client.echo.createSpace();
        navigate('/' + space.key.truncate());
      });
    }
  }, [spaces, init]);

  return null;
};
