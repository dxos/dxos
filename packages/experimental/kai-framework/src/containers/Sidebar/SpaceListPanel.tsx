//
// Copyright 2022 DXOS.org
//

import { CaretCircleDoubleDown, PlusCircle, X } from '@phosphor-icons/react';
import React from 'react';

import { Button, Input } from '@dxos/aurora';
import { getSize } from '@dxos/aurora-theme';
import { ShellLayout, useClient } from '@dxos/react-client';
import { useSpaces } from '@dxos/react-client/echo';
import { useShell } from '@dxos/react-shell';

import { SpaceList, SpaceListAction, SpaceSettings } from '../../components';
import { createPath, defaultFrameId, useAppReducer, useAppRouter, useAppState } from '../../hooks';
import { Intent } from '../../util';

export const Separator = () => {
  return <div role='separator' className='bs-px bg-neutral-400/20 mlb-2 mli-2' />;
};

export type SpacePanelProps = {
  onAction: (intent: Intent<SpaceListAction>) => void;
  onNavigate: (path: string) => void;
  onClose: () => void;
};

export const SpaceListPanel = ({ onAction, onNavigate, onClose }: SpacePanelProps) => {
  const client = useClient();
  const { showDeletedObjects } = useAppState();
  const { setShowDeletedObjects } = useAppReducer();
  const { space } = useAppRouter();
  const spaces = useSpaces();
  const shell = useShell();

  const handleCreateSpace = async () => {
    const space = await client.spaces.create();
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
        {/* TODO(burdon): Not aligned with buttons. Checkbox not part of Aurora? */}
        <div className='flex px-0.5 py-1 items-center'>
          <Input.Root id='sidebar.showDeleted'>
            <Input.Checkbox checked={showDeletedObjects} onCheckedChange={setShowDeletedObjects} />
            <Input.Label>Show deleted objects</Input.Label>
          </Input.Root>
        </div>
        <Separator />

        <Button
          variant='ghost'
          classNames='flex p-0 justify-start'
          title='Create new space'
          data-testid='sidebar.spaces.create'
          onClick={handleCreateSpace}
        >
          <PlusCircle className={getSize(6)} />
          <span className='pl-2'>Create space</span>
        </Button>
        <Button
          variant='ghost'
          classNames='flex p-0 justify-start'
          title='Join a space'
          data-testid='sidebar.joinSpace'
          onClick={handleJoinSpace}
        >
          <CaretCircleDoubleDown className={getSize(6)} />
          <span className='pl-2'>Join space</span>
        </Button>
        <Button
          variant='ghost'
          classNames='flex p-0 justify-start'
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
