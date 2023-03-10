//
// Copyright 2023 DXOS.org
//

import { FrameCorners, Robot } from 'phosphor-react';
import React, { FC, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { getSize, mx, Searchbar, Button, ButtonGroup } from '@dxos/react-components';

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
        'flex flex-col w-[200px] h-[120px] border-0 rounded-lg px-3 py-2 cursor-pointer bg-paper-1-bg hover:bg-hover-bg border',
        active && '!bg-selection-bg border-selection-border',
        slots.root?.className
      )}
      onClick={() => onSelect(id)}
    >
      <h2 className='flex mb-1 text-lg font-display font-medium'>{label}</h2>
      <div className='flex w-full'>
        <div className='flex w-full text-black text-sm pr-2'>{description}</div>
        <div>
          <Icon weight='duotone' className={mx(getSize(12), '[&>*]:stroke-[8]')} />
        </div>
      </div>
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
    <div className='flex flex-col flex-1 overflow-hidden'>
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

      <div className='flex flex-1 justify-center overflow-y-scroll'>
        <div className='flex flex-col'>
          <div className='flex flex-col grid-cols-1 gap-4 lg:grid lg:grid-cols-3 pb-24'>
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
        </div>
      </div>
    </div>
  );
};
