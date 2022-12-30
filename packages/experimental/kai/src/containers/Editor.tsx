//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { makeReactive, useQuery } from '@dxos/react-client';
import { Composer } from '@dxos/react-composer';
import { mx } from '@dxos/react-ui';

import { Card } from '../components';
import { useSpace } from '../hooks';
import { Project } from '../proto';

export const Editor = makeReactive(() => {
  const { space } = useSpace();
  const projects = useQuery(space, Project.filter());

  return (
    <Card title='Editor' className='bg-purple-400'>
      {projects[0].description?.doc && (
        <Composer
          doc={projects[0].description?.doc}
          className={mx(
            'z-0 rounded bg-white text-neutral-900 w-full p-4 dark:bg-neutral-850 dark:text-white min-bs-[12em]'
          )}
        />
      )}
    </Card>
  );
});
