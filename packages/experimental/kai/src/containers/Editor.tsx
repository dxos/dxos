//
// Copyright 2022 DXOS.org
//

import { Archive } from 'phosphor-react';
import React, { FC } from 'react';

import { useQuery, useReactor } from '@dxos/react-client';
import { getSize, mx } from '@dxos/react-components';
import { Composer } from '@dxos/react-composer';

import { Card, Input } from '../components';
import { useSpace } from '../hooks';
import { Project } from '../proto';

export const Editor: FC = () => {
  const { render } = useReactor();
  const { space } = useSpace();
  const projects = useQuery(space, Project.filter());
  if (!projects[0]) {
    return null;
  }

  return render(
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
        <div className={'flex flex-1 overflow-y-scroll border-t editor-container'}>
          <Composer
            doc={projects[0].description?.doc}
            className={mx('z-0 bg-white text-black w-full m-2 p-2 min-bs-[12em]')}
          />
        </div>
      )}
    </Card>
  );
};
