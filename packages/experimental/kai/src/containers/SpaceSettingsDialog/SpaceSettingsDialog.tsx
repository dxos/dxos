//
// Copyright 2023 DXOS.org
//

import { Square } from 'phosphor-react';
import React, { FC } from 'react';

import { Space } from '@dxos/client';
import { observer } from '@dxos/react-client';
import { Button, Dialog, DialogProps, getSize, Input, mx, useTranslation } from '@dxos/react-components';

import { icons, themes } from '../../hooks';

// TODO(burdon): Move props here, with ids.

export type SpaceSettingsDialog = {
  space: Space;
} & Pick<DialogProps, 'open' | 'onOpenChange' | 'defaultOpen'>;

export const SpaceSettingsDialog: FC<SpaceSettingsDialog> = observer(({ space, open, onOpenChange, defaultOpen }) => {
  const { t } = useTranslation('kai');

  return (
    <Dialog
      title='Space Settings'
      {...{ open, onOpenChange, defaultOpen }}
      closeTriggers={[
        <Button key='ok' variant='primary'>
          OK
        </Button>
      ]}
    >
      <div className='mt-2 mt-4 mb-6'>
        <Input
          variant='subdued'
          label='Title'
          labelVisuallyHidden
          placeholder={t('space title placeholder')}
          slots={{ input: { autoFocus: true, className: 'text-xl' } }}
          value={space.properties.name}
          onChange={(event) => {
            space.properties.name = event.target.value;
          }}
        />
      </div>

      <div className='mb-6'>
        <SpaceThemes
          selected={space.properties.theme}
          onSelect={(theme) => {
            space.properties.theme = theme;
          }}
        />
      </div>

      <div className='mb-8'>
        <SpaceIcons
          selected={space.properties.icon}
          onSelect={(icon) => {
            space.properties.icon = icon;
          }}
        />
      </div>
    </Dialog>
  );
});

export const SpaceSettings: FC<{ space: Space }> = observer(({ space }) => {
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
});

export const SpaceThemes: FC<{ selected: string; onSelect: (selected: string) => void }> = ({ selected, onSelect }) => {
  return (
    <div className='flex'>
      <div className='grid grid-cols-6'>
        {themes.map(({ id, classes }) => (
          <Button key={id} variant='ghost' className='p-0' onClick={() => onSelect(id)}>
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
          <Button key={id} variant='ghost' className='p-0' onClick={() => onSelect(id)}>
            <div className={mx('m-1 p-1', selected === id && 'ring-2 ring-black')}>
              <Icon className={getSize(6)} />
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
};
