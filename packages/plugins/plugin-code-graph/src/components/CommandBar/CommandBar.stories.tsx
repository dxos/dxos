//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';

import { translations } from '#translations';

import { CommandBar, type CommandBarProps } from './CommandBar.tsx';

const meta: Meta<CommandBarProps> = {
  title: 'plugins/plugin-code-graph/components/CommandBar',
  component: CommandBar,
  render: (args) => {
    const [open, setOpen] = useState(args.open);
    return (
      <div className='relative dx-fill'>
        <CommandBar {...args} open={open} onOpenChange={setOpen} />
      </div>
    );
  },
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: { translations: [...translations, ...reactUiTranslations] },
  args: { open: false, onSubmit: () => {}, onOpenChange: () => {} },
};

export default meta;

type Story = StoryObj<typeof meta>;

/** Closed: the floating button. */
export const Default: Story = {};

/** A command that drew more than fits, with the trailer. */
export const Outcome: Story = {
  args: {
    open: true,
    outcome: {
      command: 'What depends on identity service in halo',
      message: 'Files that import the identity service.',
      trailer: '+57 not shown: 57 files in packages/sdk/client-services (40), packages/core/halo (17), e.g. …',
      elapsedMs: 2400,
    },
  },
};

/** A command in flight. */
export const Pending: Story = {
  args: { open: true, pending: true, outcome: { command: 'show me the ECHO package exports' } },
};

/** The index could not answer. */
export const Failed: Story = {
  args: {
    open: true,
    outcome: {
      command: 'clear the graph',
      error: 'no code-index route at /api/code-index; run Composer under `vite dev` with CodeIndexVitePlugin',
    },
  },
};
