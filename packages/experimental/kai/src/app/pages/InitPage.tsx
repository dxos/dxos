//
// Copyright 2022 DXOS.org
//

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useClient, useSpaces } from '@dxos/react-client';

import { useOptions } from '../../hooks';
import { Generator } from '../../proto';

/**
 * Selects or creates an initial space.
 */
export const InitPage = () => {
  const navigate = useNavigate();
  const { demo } = useOptions();
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
        if (demo && !client.config.values.runtime?.client?.storage?.persistent) {
          await new Generator(space.experimental.db).generate();
        }

        navigate('/' + space.key.truncate());
      });
    }
  }, [spaces, init]);

  return null;
};
