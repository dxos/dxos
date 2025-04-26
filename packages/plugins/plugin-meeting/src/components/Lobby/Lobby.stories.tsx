//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { withTheme, withLayout, ColumnContainer } from '@dxos/storybook-utils';

import { Lobby } from './Lobby';
import { createMeetingPlugins } from '../../testing';
import translations from '../../translations';

const meta: Meta<typeof Lobby> = {
  title: 'plugins/plugin-meeting/Lobby',
  component: Lobby,
  // render: () => {
  //   return (
  //     <div className='flex w-[50rem] h-full overflow-hidden'>
  //       <Lobby roomId='test' />
  //     </div>
  //   );
  // },
  decorators: [
    withPluginManager({ plugins: [...(await createMeetingPlugins())] }),
    withLayout({ tooltips: true, Container: ColumnContainer, classNames: 'w-[50rem]' }),
    withTheme,
  ],
  parameters: {
    translations,
  },
};

export default meta;

type Story = StoryObj<typeof Lobby>;

export const Default: Story = {
  args: {
    roomId: 'test',
  },
};
