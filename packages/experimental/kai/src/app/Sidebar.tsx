//
// Copyright 2022 DXOS.org
//

import { PlusCircle, UserPlus } from 'phosphor-react';
import React, { useCallback, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useClient } from '@dxos/react-client';
import { getSize, ThemeContext, Button as NaturalButton } from '@dxos/react-components';
import { InvitationListContainer, PanelSeparator, SpaceMemberListContainer } from '@dxos/react-ui';

import { Button } from '../components';
import { SpaceList } from '../containers';
import { FrameID, useSpace } from '../hooks';
import { createInvitationUrl as genericCreateInvitationUrl } from '../util';
import { Actions } from './Actions';
import { createSpacePath } from './Routes';

export const Sidebar = () => {
  const navigate = useNavigate();
  const client = useClient();
  const { space } = useSpace();
  const { view } = useParams();
  const [prevView, setPrevView] = useState(view);
  const [prevSpace, setPrevSpace] = useState(space);

  // TODO(wittjosiah): Find a better way to do this.
  if (prevSpace !== space) {
    setPrevSpace(space);
  }

  if (prevView !== view) {
    setPrevView(view);
    view === FrameID.SETTINGS;
  }

  const handleCreateSpace = async () => {
    const space = await client.echo.createSpace();
    navigate(createSpacePath(space.key));
  };

  const handleCreateInvitation = useCallback(() => space.createInvitation(), [space]);

  const createInvitationUrl = useCallback(
    (invitationCode: string) => genericCreateInvitationUrl('/space/join', invitationCode),
    []
  );

  return (
    <ThemeContext.Provider value={{ themeVariant: 'os' }}>
      <div
        role='none'
        className='flex flex-col overflow-auto min-bs-full box-shadow backdrop-blur bg-neutral-50/[.33] dark:bg-neutral-950/[.33]'
      >
        {/* Match Frame selector. */}
        <div className='flex p-1 pl-4 h-[36px] pt-2 bg-orange-500'>
          <div>Spaces</div>
        </div>
        <div className='flex flex-col flex-1 border-r border-slate-200'>
          {/* Spaces */}
          <div className='flex shrink-0 flex-col overflow-y-auto'>
            <SpaceList />

            <div className='p-3'>
              <Button className='flex' title='Create new space' onClick={handleCreateSpace}>
                <span className='sr-only'>Create new space</span>
                <PlusCircle className={getSize(6)} />
              </Button>
            </div>
          </div>

          <div className='flex flex-1'></div>

          <div role='none' className='shrink pli-2 overflow-y-auto'>
            <InvitationListContainer spaceKey={space.key} {...{ createInvitationUrl }} />
          </div>
          <PanelSeparator className='mli-2' />
          <div role='none' className='mli-2'>
            <NaturalButton compact className='flex gap-2 is-full' onClick={handleCreateInvitation}>
              <span>Invite</span>
              <UserPlus className={getSize(4)} weight='bold' />
            </NaturalButton>
          </div>
          <PanelSeparator className='mli-2' />
          <div role='none' className='shrink pli-2 overflow-y-auto'>
            <SpaceMemberListContainer spaceKey={space.key} includeSelf />
          </div>
          <PanelSeparator className='mli-2' />

          <Actions />
        </div>
      </div>
    </ThemeContext.Provider>
  );
};
