//
// Copyright 2022 DXOS.org
//

import { PlusCircle } from 'phosphor-react';
import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { PublicKey } from '@dxos/client';
import { useClient, useMembers, useSpaces } from '@dxos/react-client';
import { getSize } from '@dxos/react-components';

import { Button, MemberList, SpaceList } from '../components';
import { useSpace, createSpacePath } from '../hooks';
import { Actions } from './Actions';

export const Sidebar = () => {
  const { frame, view } = useParams();
  const navigate = useNavigate();
  const client = useClient();
  const space = useSpace();
  const spaces = useSpaces();
  const members = useMembers(space.key);
  const [prevView, setPrevView] = useState(view);
  const [prevSpace, setPrevSpace] = useState(space);

  // TODO(wittjosiah): Find a better way to do this.
  if (prevSpace !== space) {
    setPrevSpace(space);
  }

  if (prevView !== view) {
    setPrevView(view);
  }

  const handleCreateSpace = async () => {
    const space = await client.echo.createSpace();
    navigate(createSpacePath(space.key));
  };

  // TODO(burdon): Quick invite.
  const handleShareSpace = (spaceKey: PublicKey) => {
    navigate(createSpacePath(spaceKey, frame));
  };

  return (
    <div
      role='none'
      className='flex flex-col overflow-auto min-bs-full box-shadow backdrop-blur bg-neutral-50/[.33] dark:bg-neutral-950/[.33]'
    >
      {/* Match Frame selector. */}
      <div className='flex p-1 pl-4 h-framepicker pt-2 bg-orange-500'>
        <div>Spaces</div>
      </div>
      <div className='flex flex-col flex-1 border-r border-slate-200'>
        {/* Spaces */}
        <div className='flex shrink-0 flex-col overflow-y-auto'>
          <SpaceList value={space.key} spaces={spaces} onSelect={handleShareSpace} />

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
            <MemberList identityKey={client.halo.profile!.identityKey} members={members} />
          </div>
        </div>

        <Actions />
      </div>
    </div>
  );
};
