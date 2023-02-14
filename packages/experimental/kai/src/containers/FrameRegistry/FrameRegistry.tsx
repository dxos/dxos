//
// Copyright 2023 DXOS.org
//

import { FrameCorners, Robot } from 'phosphor-react';
import React, { FC, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { getSize, mx, Searchbar, Button } from '@dxos/react-components';

import { createSpacePath, useBots, useFrames, useSpace, BotDef, FrameDef, useAppReducer } from '../../hooks';

// TODO(burdon): Move to DMG?
enum ExtensionType {
  FRAME,
  BOT
}

const Tile: FC<{
  id: string;
  label: string;
  description?: string;
  active: boolean;
  Icon: FC<any>;
  onSelect: (id: string) => void;
}> = ({ id, label, description, active, Icon, onSelect }) => {
  return (
    <div
      className={mx(
        'flex w-[240px] h-[140px] border-0 rounded-lg p-4 bg-gray-200 drop-shadow-md',
        '[&>div>svg]:hover:text-black hover:bg-blue-200',
        active && 'bg-blue-300 text-black'
      )}
      onClick={() => onSelect(id)}
    >
      <div className='flex flex-1 flex-col'>
        <h2 className='text-xl font-display font-medium text-black mb-1'>{label}</h2>
        <div className='text-black'>{description}</div>
      </div>
      <div className='flex flex-col justify-center ml-2 text-black'>
        <Icon weight='duotone' className={mx(getSize(16), '[&>*]:stroke-[8]')} />
      </div>
    </div>
  );
};

export const FrameRegistry = () => {
  const space = useSpace();
  const navigate = useNavigate();
  const [type, setType] = useState<ExtensionType>(ExtensionType.FRAME);

  const { frames, active: activeFrames } = useFrames();
  const { bots, active: activeBots } = useBots();
  const { setActiveFrame, setActiveBot } = useAppReducer();

  const handleSelect = (id: string) => {
    switch (type) {
      case ExtensionType.FRAME: {
        const active = !activeFrames.find((frameId) => frameId === id);
        setActiveFrame(id, active);
        if (active) {
          navigate(createSpacePath(space.key, id));
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
      <div className='flex justify-center'>
        <div className='flex w-column items-center m-10'>
          <Searchbar disabled />
          <div className='ml-4'>
            <Button compact className='ml-2' onClick={() => setType(ExtensionType.FRAME)} title='Frames'>
              <FrameCorners
                weight={type === ExtensionType.FRAME ? 'regular' : 'thin'}
                className={mx(getSize(8), 'text-gray-400', type === ExtensionType.FRAME && 'text-800')}
              />
            </Button>
            <Button compact className='ml-2' onClick={() => setType(ExtensionType.BOT)} title='Bots'>
              <Robot
                weight={type === ExtensionType.BOT ? 'regular' : 'thin'}
                className={mx(getSize(8), 'text-gray-400', type === ExtensionType.BOT && 'text-800')}
              />
            </Button>
          </div>
        </div>
      </div>

      <div className='flex flex-1 justify-center overflow-y-scroll'>
        <div className='flex flex-col p-4'>
          <div className='flex flex-col grid-cols-1 gap-4 lg:grid lg:grid-cols-3'>
            {Array.from(modules.values())
              // .filter(({ system }) => !system)
              .map(({ module: { id, displayName, description }, runtime: { Icon } }) => (
                <Tile
                  key={id!}
                  id={id!}
                  label={displayName ?? id!}
                  description={description}
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
