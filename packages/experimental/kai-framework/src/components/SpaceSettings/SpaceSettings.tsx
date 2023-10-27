//
// Copyright 2023 DXOS.org
//

import { Square } from '@phosphor-icons/react';
import React, { FC } from 'react';

import { Button } from '@dxos/react-ui';
import { getSize, mx } from '@dxos/react-ui-theme';
import { Space } from '@dxos/react-client/echo';

import { icons, themes } from '../../hooks';

export const SpaceSettings: FC<{ space: Space }> = ({ space }) => {
  return (
    <div>
      <SpaceThemes
        selected={space.properties.theme}
        onSelect={(theme) => {
          space.properties.theme = theme;
        }}
      />
      <SpaceIcons
        selected={space.properties.icon}
        onSelect={(icon) => {
          space.properties.icon = icon;
        }}
      />
    </div>
  );
};

export const SpaceThemes: FC<{ selected: string; onSelect: (selected: string) => void }> = ({ selected, onSelect }) => {
  return (
    <div className='flex'>
      <div className='grid grid-cols-6'>
        {themes.map(({ id, classes }) => (
          <Button key={id} variant='ghost' classNames='p-0' onClick={() => onSelect(id)}>
            <div className={mx('m-2', selected === id && 'ring-2 ring-black')}>
              <Square className={mx(getSize(6), classes.header, 'text-transparent')} />
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
};

export const SpaceIcons: FC<{ selected: string; onSelect: (selected: string) => void }> = ({ selected, onSelect }) => {
  return (
    <div className='flex'>
      <div className='grid grid-cols-6'>
        {icons.map(({ id, Icon }) => (
          <Button key={id} variant='ghost' classNames='p-0' onClick={() => onSelect(id)}>
            <div className={mx('m-1 p-1', selected === id && 'rounded ring-2 ring-black')}>
              <Icon className={getSize(6)} />
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
};
