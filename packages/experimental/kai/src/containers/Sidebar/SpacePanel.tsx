//
// Copyright 2022 DXOS.org
//

import { CaretCircleDoubleDown, PlusCircle, X } from '@phosphor-icons/react';
import React from 'react';

import { Button, getSize } from '@dxos/aurora';
import { ShellLayout, useClient, useSpaces } from '@dxos/react-client';
import { useShell } from '@dxos/react-shell';

import { SpaceList, SpaceListAction, SpaceSettings } from '../../components';
import { createPath, defaultFrameId, useAppRouter } from '../../hooks';
import { Intent } from '../../util';

export type SpacePanelProps = {
  onAction: (intent: Intent<SpaceListAction>) => void;
  onNavigate: (path: string) => void;
  onClose: () => void;
};

export const SpacePanel = ({ onAction, onNavigate, onClose }: SpacePanelProps) => {
  const client = useClient();
  const { space } = useAppRouter();
  const spaces = useSpaces();
  const shell = useShell();

  const handleCreateSpace = async () => {
    const space = await client.createSpace();
    onNavigate(createPath({ spaceKey: space.key, frame: defaultFrameId }));
  };

  const handleJoinSpace = () => {
    void shell.setLayout(ShellLayout.JOIN_SPACE, { spaceKey: space!.key });
  };

  if (!space) {
    return null;
  }

  return (
    <div className='flex flex-col w-full overflow-y-auto bg-white border-b'>
      <div className='flex justify-center my-4'>
        <SpaceSettings space={space} />
      </div>

      <div className='border-t border-b'>
        <SpaceList spaces={spaces} selected={space.key} onAction={onAction} />
      </div>

      <div className='flex flex-col px-4 py-2'>
        <Button
          variant='ghost'
          className='flex p-0 justify-start'
          title='Create new space'
          data-testid='sidebar.createSpace'
          onClick={handleCreateSpace}
        >
          <PlusCircle className={getSize(6)} />
          <span className='pl-2'>Create space</span>
        </Button>
        <Button
          variant='ghost'
          className='flex p-0 justify-start'
          title='Join a space'
          data-testid='sidebar.joinSpace'
          onClick={handleJoinSpace}
        >
          <CaretCircleDoubleDown className={getSize(6)} />
          <span className='pl-2'>Join space</span>
        </Button>
        <Button
          variant='ghost'
          className='flex p-0 justify-start'
          title='Close settings'
          data-testid='sidebar.closeSettings'
          onClick={onClose}
        >
          <X className={getSize(6)} />
          <span className='pl-2'>Close</span>
        </Button>
      </div>
    </div>
  );
};
