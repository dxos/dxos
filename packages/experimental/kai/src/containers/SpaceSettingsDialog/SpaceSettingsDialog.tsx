//
// Copyright 2023 DXOS.org
//

import { Square } from 'phosphor-react';
import React, { FC } from 'react';

import { Space } from '@dxos/client';
import { withReactor } from '@dxos/react-client';
import { Button, Dialog, getSize, Input, mx, useTranslation } from '@dxos/react-components';

import { icons, themes } from '../../hooks';

// TODO(burdon): Move props here, with ids.

export type SpaceSettingsDialog = {
  space: Space;
  open?: boolean;
  onClose?: () => void;
};

export const SpaceSettingsDialog: FC<SpaceSettingsDialog> = withReactor(({ space, open, onClose }) => {
  const { t } = useTranslation('kai');

  return (
    <Dialog initiallyOpen={!!open} onClose={() => onClose?.()} title='Space Settings'>
      <div>
        <Input
          label='Title'
          labelVisuallyHidden
          variant='subdued'
          placeholder={t('space title placeholder')}
          slots={{ input: { autoFocus: true, className: 'text-xl' } }}
          value={space.properties.name}
          onChange={(event) => {
            space.properties.name = event.target.value;
          }}
        />
      </div>

      <div className='mb-6'>
        <Themes
          selected={space.properties.theme}
          onSelect={(theme) => {
            space.properties.theme = theme;
          }}
        />
      </div>

      <div className='mb-8'>
        <Icons
          selected={space.properties.icon}
          onSelect={(icon) => {
            space.properties.icon = icon;
          }}
        />
      </div>

      <Button variant='primary' onClick={onClose}>
        OK
      </Button>
    </Dialog>
  );
});

const Themes: FC<{ selected: string; onSelect: (selected: string) => void }> = ({ selected, onSelect }) => {
  return (
    <div className='flex'>
      <div className='grid grid-cols-6'>
        {themes.map(({ id, classes }) => (
          <Button key={id} variant='ghost' onClick={() => onSelect(id)}>
            <div className={mx('m-1', selected === id && 'ring-2 ring-black')}>
              <Square className={mx(getSize(6), classes.header, 'text-transparent')} />
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
};

const Icons: FC<{ selected: string; onSelect: (selected: string) => void }> = ({ selected, onSelect }) => {
  return (
    <div className='flex'>
      <div className='grid grid-cols-6'>
        {icons.map(({ id, Icon }) => (
          <Button key={id} variant='ghost' onClick={() => onSelect(id)}>
            <div className={mx('p-1', selected === id && 'ring-2 ring-black')}>
              <Icon className={getSize(6)} />
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
};
