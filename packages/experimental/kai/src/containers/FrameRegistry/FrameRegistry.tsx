//
// Copyright 2023 DXOS.org
//

import { FrameCorners, Robot } from '@phosphor-icons/react';
import React, { FC, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { ScrollContainer } from '@dxos/mosaic';
import { getSize, mx, Searchbar, Button, ButtonGroup, Dialog } from '@dxos/react-components';

import { useBots, useFrames, BotDef, FrameDef, useAppReducer, createPath, useAppRouter } from '../../hooks';

// TODO(burdon): Move to DMG?
enum ExtensionType {
  FRAME,
  BOT
}

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
        'flex flex-col w-[180px] h-[100px] border-0 rounded-lg px-3 py-2',
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
  { module: { displayName: a, tags: t1 } }: FrameDef | BotDef,
  { module: { displayName: b, tags: t2 } }: FrameDef | BotDef
) => (len(t1) < len(t2) ? -1 : len(t1) > len(t2) ? 1 : a! < b! ? -1 : a! > b! ? 1 : 0);

export const FrameRegistry: FC<{ slots?: FrameRegistrySlots }> = ({ slots = {} }) => {
  const { space } = useAppRouter();
  const navigate = useNavigate();
  const [type, setType] = useState<ExtensionType>(ExtensionType.FRAME);

  const { frames, active: activeFrames } = useFrames();
  const { bots, active: activeBots } = useBots();
  const { setActiveFrame, setActiveBot } = useAppReducer();

  const handleSelect = (id: string) => {
    switch (type) {
      case ExtensionType.FRAME: {
        const active = !activeFrames.find((frameId) => frameId === id);
        setActiveFrame(id, active); // TODO(burdon): Reconcile with navigation.
        if (active) {
          navigate(createPath({ spaceKey: space!.key, frame: id }));
        }
        break;
      }

      case ExtensionType.BOT: {
        const active = !activeBots.find((botId) => botId === id);
        setActiveBot(id, active, space);
        break;
      }
    }
  };

  const modules: Map<string, FrameDef | BotDef> = type === ExtensionType.FRAME ? frames : bots;

  return (
    <div className='flex flex-col flex-1 overflow-hidden py-4'>
      {false && (
        <div className='flex py-8 justify-center'>
          <ButtonGroup className='flex gap-2 w-column p-2 px-4 bg-white items-center'>
            <Searchbar />
            <Button variant='ghost' className='pli-1' onClick={() => setType(ExtensionType.FRAME)} title='Frames'>
              <FrameCorners
                weight={type === ExtensionType.FRAME ? 'regular' : 'thin'}
                className={mx(getSize(8), 'text-gray-400', type === ExtensionType.FRAME && 'text-800')}
              />
            </Button>
            <Button variant='ghost' className='pli-1' onClick={() => setType(ExtensionType.BOT)} title='Bots'>
              <Robot
                weight={type === ExtensionType.BOT ? 'regular' : 'thin'}
                className={mx(getSize(8), 'text-gray-400', type === ExtensionType.BOT && 'text-800')}
              />
            </Button>
          </ButtonGroup>
        </div>
      )}

      <ScrollContainer vertical>
        <div className='flex flex-wrap gap-3'>
          {Array.from(modules.values())
            .sort(sorter)
            .map(({ module: { id, displayName, description }, runtime: { Icon } }) => (
              <Tile
                key={id!}
                id={id!}
                label={displayName ?? id!}
                description={description}
                slots={slots}
                Icon={Icon}
                onSelect={handleSelect}
                active={
                  !!((type === ExtensionType.FRAME ? activeFrames : activeBots) as any[]).find(
                    (active) => active === id
                  )
                }
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
      slots={{ content: { className: 'overflow-hidden max-h-[50vh] max-w-full md:max-h-[50vh] md:max-w-[620px]' } }}
    >
      <FrameRegistry />
    </Dialog>
  );
};
