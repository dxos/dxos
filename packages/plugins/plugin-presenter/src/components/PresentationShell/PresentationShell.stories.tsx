//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import * as Button from '@dxos/react-ui/Button';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { createSlide } from '#testing';

import { MarkdownSlide } from '../MarkdownSlide/index.ts';
import { Slide } from '../Slide/index.ts';
import { PresentationShell, type PresentationShellProps } from './PresentationShell.tsx';

// Remounts the shell on re-enter so its fade-in runs again after an exit.
const DefaultStory = (props: PresentationShellProps) => {
  const [open, setOpen] = useState(true);
  if (!open) {
    return (
      <div className='flex grow items-center justify-center'>
        <Button.Root onClick={() => setOpen(true)}>Enter</Button.Root>
      </div>
    );
  }

  return (
    <PresentationShell {...props} onExit={() => setOpen(false)}>
      <div className='dx-cover flex flex-col'>
        <Slide.Frame>
          <MarkdownSlide content={createSlide({ number: 1, code: true })} />
        </Slide.Frame>
      </div>
    </PresentationShell>
  );
};

const meta = {
  title: 'plugins/plugin-presenter/components/PresentationShell',
  component: PresentationShell,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof PresentationShell>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Companion: Story = {
  args: {
    fullscreen: false,
  },
};
