//
// Copyright 2022 DXOS.org
//

import { PlusCircle } from 'phosphor-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';

import { useClient } from '@dxos/react-client';
import { getSize } from '@dxos/react-components';

import { Button } from '../../components';
import { MemberList, SpaceList } from '../../containers';
import { useSpace } from '../../hooks';
import { createSpacePath } from '../Routes';
import { Actions } from './Actions';

export const Sidebar = () => {
  const navigate = useNavigate();
  const client = useClient();
  const { space } = useSpace();

  const handleCreateSpace = async () => {
    const space = await client.echo.createSpace();
    navigate(createSpacePath(space.key));
  };

  return (
    <div className='flex flex-1 flex-col bg-gray-50 overflow-hidden border-r'>
      {/* Spaces */}
      <div className='flex flex-shrink-0 flex-col overflow-y-scroll'>
        <SpaceList />
        <div className='p-3'>
          <Button className='flex' title='Create new space' onClick={handleCreateSpace}>
            <PlusCircle className={getSize(6)} />
          </Button>
        </div>
      </div>

      <div className='flex flex-1'></div>

      {/* Members */}
      <div className='flex flex-col flex-shrink-0 mt-6'>
        <div className='flex p-1 pl-3 mb-2 text-xs'>Members</div>
        <div className='flex flex-shrink-0 pl-3'>
          <MemberList spaceKey={space.key} />
        </div>
      </div>

      <Actions />
    </div>
  );
};
