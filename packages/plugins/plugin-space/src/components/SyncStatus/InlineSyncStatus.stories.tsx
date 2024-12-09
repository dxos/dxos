//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React, { useEffect, useState } from 'react';

import { withTheme, withLayout } from '@dxos/storybook-utils';

import { InlineSyncStatusIndicator } from './InlineSyncStatus';
import translations from '../../translations';

const DefaultStory = () => {
  const [spaces, setSpaces] = useState(['space-1']);
  useEffect(() => {
    const t = setInterval(() => {
      if (Math.random() > 0.7) {
        setSpaces((spaces) => spaces.slice(1));
      } else {
        setSpaces((spaces) => [...spaces, `space-${spaces.length + 1}`]);
      }
    }, Math.random() * 3_000);
    return () => clearInterval(t);
  });

  return (
    <div className='flex flex-col p-2 w-[200px]'>
      {spaces.map((space) => (
        <div key={space} className='flex items-center'>
          <div className='grow'>{space}</div>
          <InlineSyncStatusIndicator />
        </div>
      ))}
    </div>
  );
};

const meta: Meta = {
  title: 'plugins/plugin-space/InlineSyncStatusIndicator',
  component: InlineSyncStatusIndicator,
  render: DefaultStory,
  decorators: [withTheme, withLayout({ fullscreen: true })],
  parameters: { translations },
};

export default meta;

export const Default = {};
