//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React, { useEffect, useState } from 'react';

import { withTheme, withLayout } from '@dxos/storybook-utils';
import { range } from '@dxos/util';

import { InlineSyncStatusIndicator } from './InlineSyncStatus';
import translations from '../../translations';

const DefaultStory = () => {
  const [spaces, setSpaces] = useState(
    new Map<string, boolean>(range(8).map((i) => [`space-${i + 1}`, Math.random() > 0.5])),
  );

  useEffect(() => {
    const t = setInterval(
      () => {
        setSpaces((spaces) => {
          const space = Array.from(spaces.keys())[Math.floor(Math.random() * spaces.size)];
          spaces.set(space, !spaces.get(space));
          return spaces;
        });
      },
      2_000 + Math.random() * 3_000,
    );
    return () => clearInterval(t);
  });

  return (
    <div className='flex flex-col p-2 w-[200px]'>
      {Array.from(spaces.entries()).map(([space, sync]) => (
        <div key={space} className='flex items-center'>
          <div className='grow'>{space}</div>
          {sync && <InlineSyncStatusIndicator />}
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
