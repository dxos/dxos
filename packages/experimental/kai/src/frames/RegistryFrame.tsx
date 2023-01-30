//
// Copyright 2023 DXOS.org
//

import { AppStoreLogo, Robot } from 'phosphor-react';
import React, { FC, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { getSize, mx } from '@dxos/react-components';

import { Searchbar } from '../components';
import {
  BotID,
  FrameID,
  createSpacePath,
  useActiveBots,
  useActiveFrames,
  useBotDispatch,
  useBots,
  useFrameDispatch,
  useFrames,
  useSpace
} from '../hooks';

type ExtensionType = 'app' | 'bot';

const Tile: FC<{
  id: string;
  title: string;
  description?: string;
  active: boolean;
  Icon: FC<any>;
  onSelect: (id: string) => void;
}> = ({ id, title, description, active, Icon, onSelect }) => {
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
        <h2 className='text-xl font-display font-medium text-black mb-1'>{title}</h2>
        <div className='text-black'>{description}</div>
      </div>
      <div className='flex flex-col justify-center ml-2 text-black'>
        <Icon weight='duotone' className={mx(getSize(16), '[&>*]:stroke-[8]')} />
      </div>
    </div>
  );
};

/**
 * DMG Explorer.
 * https://ifttt.com/explore
 */
const RegistryFrame = () => {
  const space = useSpace();
  const navigate = useNavigate();
  const [type, setType] = useState<ExtensionType>('app');

  // TODO(burdon): DMG.
  const frames = useFrames();
  const activeFrames = useActiveFrames();
  const setActiveFrame = useFrameDispatch();
  const bots = useBots();
  const activeBots = useActiveBots();
  const setActiveBot = useBotDispatch();

  const handleSelect = (id: string) => {
    switch (type) {
      case 'app': {
        const active = !activeFrames.find((frame) => frame.id === id);
        setActiveFrame(id as FrameID, active);
        if (active) {
          navigate(createSpacePath(space.key, id));
        }
        break;
      }

      case 'bot': {
        // TODO(burdon): Toggle.
        setActiveBot(id as BotID, true);
        break;
      }
    }
  };

  return (
    <div className='flex flex-col flex-1'>
      <div className='flex justify-center'>
        <div className='flex w-[400px] items-center m-10'>
          <Searchbar />
          <div className='ml-4'>
            <button className='ml-2' onClick={() => setType('app')} title='Apps'>
              <AppStoreLogo
                weight={type === 'app' ? 'regular' : 'thin'}
                className={mx(getSize(8), 'text-gray-400', type === 'app' && 'text-800')}
              />
            </button>
            <button className='ml-2' onClick={() => setType('bot')} title='Bots'>
              <Robot
                weight={type === 'bot' ? 'regular' : 'thin'}
                className={mx(getSize(8), 'text-gray-400', type === 'bot' && 'text-800')}
              />
            </button>
          </div>
        </div>
      </div>

      <div className='flex justify-center'>
        <div className='flex flex-col p-4'>
          <div className='flex flex-col grid-cols-1 gap-4 lg:grid lg:grid-cols-3'>
            {Object.values(type === 'app' ? frames : bots)
              .filter(({ system }) => !system)
              .map(({ id, title, description, Icon }) => (
                <Tile
                  key={id}
                  id={id}
                  title={title}
                  description={description}
                  Icon={Icon}
                  onSelect={handleSelect}
                  active={!!((type === 'app' ? activeFrames : activeBots) as any[]).find((active) => active.id === id)}
                />
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistryFrame;