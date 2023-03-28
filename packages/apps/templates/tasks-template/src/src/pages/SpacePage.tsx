//
// Copyright 2023 DXOS.org
//

import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { Menubar, SpacesLink } from '@dxos/react-appkit';
import { useSpace } from '@dxos/react-client';

import { TaskList } from '../containers/TaskList';

export const SpacePage = () => {
  const { spaceId } = useParams();
  const space = useSpace(spaceId);
  const navigate = useNavigate();
  return (
    <>
      <Menubar>
        <SpacesLink onClickGoToSpaces={() => navigate('..')} />
      </Menubar>
      <div className='mt-14'>{space ? <TaskList space={space} /> : null}</div>
    </>
  );
};
