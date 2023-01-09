//
// Copyright 2022 DXOS.org
//

import { Archive } from 'phosphor-react';
import React, { FC } from 'react';

import { useQuery, withReactor } from '@dxos/react-client';
import { getSize, mx } from '@dxos/react-components';
import { Composer } from '@dxos/react-composer';

import { Card, Input } from '../components';
import { useSpace } from '../hooks';
import { Project } from '../proto';

export const Editor: FC = withReactor(() => {
  const { space } = useSpace();
  const projects = useQuery(space, Project.filter()); // TODO(burdon): Pass in project.
  if (!projects[0]) {
    return null;
  }

  const project = projects[0];

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
          onChange={(value) => (project.title = value)}
        />
      </div>

      {projects[0].description?.doc && (
        <div className={'flex flex-1 overflow-y-scroll border-t editor-container'}>
          <Composer
            doc={project.description?.doc}
            className={mx('z-0 bg-white text-black w-full m-2 p-2 min-bs-[12em]')}
          />
        </div>
      )}
    </Card>
  );
});
