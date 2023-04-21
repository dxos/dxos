//
// Copyright 2023 DXOS.org
//

import React, { FC } from 'react';
import { useNavigate } from 'react-router-dom';

import { getSize, mx } from '@dxos/aurora';
import { useFrameRegistry, FrameDef } from '@dxos/kai-frames';
import { ScrollContainer } from '@dxos/mosaic';
import { Dialog } from '@dxos/react-appkit';

import { useAppReducer, createPath, useAppRouter, useAppState } from '../../hooks';

// TODO(burdon): Inject generic classes for slots from themecontext.

export type FrameRegistrySlots = {
  root?: {
    className?: string;
  };
  tile?: {
    className?: string;
  };
};

const Tile: FC<{
  id: string;
  label: string;
  description?: string;
  active: boolean;
  slots?: FrameRegistrySlots;
  Icon: FC<any>;
  onSelect: (id: string) => void;
}> = ({ id, label, description, active, slots = {}, Icon, onSelect }) => {
  return (
    <div
      className={mx(
        'flex flex-col w-[180px] h-[100px] border-0 rounded px-3 py-2',
        'cursor-pointer bg-paper-1-bg hover:bg-hover-bg border',
        active && 'border-selection-border !bg-selection-bg',
        slots.root?.className
      )}
      onClick={() => onSelect(id)}
    >
      <div className='flex w-full'>
        <h2 className='flex w-full mb-1 text-lg font-display font-medium'>{label}</h2>
        <div>
          <Icon weight='duotone' className={mx(getSize(8), '[&>*]:stroke-[8]')} />
        </div>
      </div>
      <div className='flex w-full pt-1 text-black text-sm'>{description}</div>
    </div>
  );
};

// Rank last if tags.
// TODO(burdon): Create sections (e.g., Community).
const len = (array?: any[]) => array?.length ?? 0;
const sorter = (
  { module: { displayName: a, tags: t1 } }: FrameDef<any>,
  { module: { displayName: b, tags: t2 } }: FrameDef<any>
) => (len(t1) < len(t2) ? -1 : len(t1) > len(t2) ? 1 : a! < b! ? -1 : a! > b! ? 1 : 0);

export const FrameRegistry: FC<{ slots?: FrameRegistrySlots; onSelect?: (frameId: string) => void }> = ({
  slots = {},
  onSelect
}) => {
  const { space } = useAppRouter();
  const navigate = useNavigate();
  const { frames: activeFrames } = useAppState();
  const frameRegistry = useFrameRegistry();
  const { setActiveFrame } = useAppReducer();

  // TODO(burdon): Active should depend on objects within the Space.
  const handleSelect = (id: string) => {
    const active = !activeFrames.find((frameId) => frameId === id);
    setActiveFrame(id, active); // TODO(burdon): Reconcile with navigation.
    if (active) {
      navigate(createPath({ spaceKey: space!.key, frame: id }));
      onSelect?.(id);
    }
  };

  return (
    <div className='flex flex-col flex-1 overflow-hidden py-4'>
      <ScrollContainer vertical>
        <div className='flex flex-wrap gap-3'>
          {frameRegistry.frames.sort(sorter).map(({ module: { id, displayName, description }, runtime: { Icon } }) => (
            <Tile
              key={id!}
              id={id!}
              label={displayName ?? id!}
              description={description}
              slots={slots}
              Icon={Icon}
              onSelect={handleSelect}
              active={!!activeFrames.find((active) => active === id)}
            />
          ))}
        </div>
      </ScrollContainer>
    </div>
  );
};

export type FrameRegistryDialogProps = {
  open?: boolean;
  onClose: () => void;
};

export const FrameRegistryDialog = ({ open, onClose }: FrameRegistryDialogProps) => {
  return (
    <Dialog
      open={open}
      onOpenChange={() => onClose()}
      title='Frame Plugins'
      closeLabel='Close'
      slots={{ content: { className: 'overflow-hidden max-w-full max-h-[50vh] md:max-w-[620px] md:max-h-[640px]' } }}
    >
      <FrameRegistry onSelect={() => onClose()} />
    </Dialog>
  );
};
