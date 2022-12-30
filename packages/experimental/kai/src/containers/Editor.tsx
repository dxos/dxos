//
// Copyright 2022 DXOS.org
//

import { Archive } from 'phosphor-react';
import React from 'react';

import { makeReactive, useQuery } from '@dxos/react-client';
import { Composer } from '@dxos/react-composer';
import { getSize, mx } from '@dxos/react-ui';

import { Card, Input } from '../components';
import { useSpace } from '../hooks';
import { Project } from '../proto';

export const Editor = makeReactive(() => {
  const { space } = useSpace();
  const projects = useQuery(space, Project.filter());

  if (!projects[0]) {
    return null;
  }

  return (
    <Card title='Editor' className='bg-purple-400'>
      <div className='flex p-2 pb-0 items-center'>
        <div className='pl-2 pr-1'>
          <Archive className={getSize(6)} />
        </div>
        <Input
          className='w-full p-1 text-lg outline-0'
          spellCheck={false}
          value={projects[0].title}
          onChange={(value) => (projects[0].title = value)}
        />
      </div>
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
