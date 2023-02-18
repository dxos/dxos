//
// Copyright 2022 DXOS.org
//

import React from 'react';
import { useOutletContext } from 'react-router-dom';

import type { Space } from '@dxos/client';
import { useQuery } from '@dxos/react-client';
import { Loading } from '@dxos/react-components';
import { Composer } from '@dxos/react-composer';

import { Document } from '../proto';

export const SpacePage = () => {
  const { space } = useOutletContext<{ space: Space }>();

  const [document] = useQuery(space, Document.filter());

  return document.content ? (
    <Composer
      document={document.content}
      slots={{
        editor: {
          className:
            'z-0 rounded bg-white text-neutral-900 w-full p-4 dark:bg-neutral-850 dark:text-white min-bs-[12em]'
        }
      }}
    />
  ) : (
    <Loading label='Loading' size='md' />
  );
};
