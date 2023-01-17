//
// Copyright 2022 DXOS.org
//

import { PlusCircle } from 'phosphor-react';
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useClient } from '@dxos/react-client';
import { getSize } from '@dxos/react-components';
import { useTogglePanelSidebar } from '@dxos/react-ui';

import { Button } from '../components';
import { MemberList, SpaceList } from '../containers';
import { FrameID, useSpace } from '../hooks';
import { Actions } from './Actions';
import { createSpacePath } from './Routes';

export const Sidebar = () => {
  const navigate = useNavigate();
  const client = useClient();
  const { space } = useSpace();

  const toggleSidebar = useTogglePanelSidebar();
  const { view } = useParams();
  const [prevView, setPrevView] = useState(view);
  const [prevSpace, setPrevSpace] = useState(space);

  // TODO(wittjosiah): Find a better way to do this.
  if (prevSpace !== space) {
    setPrevSpace(space);
    toggleSidebar();
  }

  if (prevView !== view) {
    setPrevView(view);
    view === FrameID.SETTINGS && toggleSidebar();
  }

  const handleCreateSpace = async () => {
    const space = await client.echo.createSpace();
    navigate(createSpacePath(space.key));
  };

  return (
    <div
      role='none'
      className='flex flex-col overflow-auto min-bs-full backdrop-blur bg-neutral-50/[.33] dark:bg-neutral-950/[.33]'
    >
      {/* Spaces */}
      <div className='flex shrink-0 flex-col overflow-y-scroll'>
        <SpaceList />
        <div className='p-3'>
          <Button className='flex' title='Create new space' onClick={handleCreateSpace}>
            <span className='sr-only'>Create new space</span>
            <PlusCircle className={getSize(6)} />
          </Button>
        </div>
      </div>

      <div className='flex flex-1'></div>

      {/* Members */}
      <div className='flex flex-col shrink-0 mt-6'>
        <div className='flex p-1 pl-3 mb-2 text-xs'>Members</div>
        <div className='flex shrink-0 pl-3'>
          <MemberList spaceKey={space.key} />
        </div>
      </div>

      <Actions />
    </div>
  );
};
