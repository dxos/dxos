//
// Copyright 2023 DXOS.org
//

import {
  AppStoreLogo,
  Article,
  Binoculars,
  Calendar,
  Compass,
  Graph,
  Kanban,
  ListChecks,
  Robot,
  Sword
} from 'phosphor-react';
import React, { FC, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { getSize, mx } from '@dxos/react-components';

import { createSpacePath } from '../app';
import { AppView } from '../app/defs';
import { AIBot, ChessBot } from '../bots';
import { Searchbar } from '../components';
import { useSpace } from '../hooks';

type ExtensionType = 'app' | 'bot';

type Extension = {
  id: string;
  title: string;
  Icon: FC<any>;
};

// https://ifttt.com/explore
const extensions: { [index: string]: { items: Extension[]; classes: string } } = {
  app: {
    // TODO(burdon): Reconcile with viewDefs (app/defs).
    items: [
      { id: AppView.DOCUMENTS, Icon: Article, title: 'Documents' },
      { id: AppView.KANBAN, Icon: Kanban, title: 'Kanban' },
      { id: AppView.TASKS, Icon: ListChecks, title: 'Tasks' },
      { id: AppView.CALENDAR, Icon: Calendar, title: 'Calendar' },
      { id: AppView.EXPLORER, Icon: Graph, title: 'Explorer' },
      { id: AppView.MAPS, Icon: Compass, title: 'Maps' },
      { id: AppView.CHESS, Icon: Sword, title: 'Chess' }
    ],
    classes: 'hover:bg-blue-300'
  },
  bot: {
    items: [
      { id: 'research-bot', Icon: Binoculars, title: 'ResearchBot' },
      { id: 'chess-bot', Icon: Sword, title: 'ChessBot' }
    ],
    classes: 'hover:bg-teal-300'
  }
};

// TODO(burdon): Context.
const useExtensions = () => {};

/**
 * DMG Explorer.
 */
export const DMGView = () => {
  const { space } = useSpace();
  const navigate = useNavigate();
  const [type, setType] = useState<ExtensionType>('app');

  const handleSelect = (id: string) => {
    switch (type) {
      // TODO(burdon): Navigate on select.
      case 'app': {
        navigate(createSpacePath(space.key, id));
        break;
      }

      case 'bot': {
        switch (id) {
          case 'ai-bot': {
            new AIBot(space.experimental.db).start();
            break;
          }
          case 'chess-bot': {
            new ChessBot(space.experimental.db).start();
            break;
          }
        }

        break;
      }
    }
  };

  return (
    <div className='flex flex-col flex-1 overflow-hidden'>
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

      <div className='flex justify-center overflow-hidden'>
        <div className='flex flex-col overflow-y-scroll p-4'>
          <div className='flex flex-col grid-cols-1 gap-8 lg:grid lg:grid-cols-3'>
            {extensions[type].items.map(({ id, title, Icon }) => (
              <div
                key={id}
                className={mx(
                  'flex flex-col items-center w-[160px] h-[160px] border-0 rounded-lg p-4 bg-gray-200 [&>div>svg]:hover:text-black',
                  extensions[type].classes
                )}
                onClick={() => handleSelect(id)}
              >
                <div className='text-xl font-thin text-black'>{title}</div>
                <div className='mt-5'>
                  <Icon weight='thin' className={mx(getSize(16), 'text-gray-400')} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
