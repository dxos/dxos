//
// Copyright 2022 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { withTheme } from '@dxos/react-ui/testing';
import React, { type PropsWithChildren, type ReactNode, useRef, useState } from 'react';

import { faker } from '@dxos/random';

import { Button } from '../Buttons';

import { Popover } from './Popover';

faker.seed(1234);

const DefaultStory = ({ openTrigger, children }: PropsWithChildren<{ openTrigger: ReactNode }>) => {
  return (
    <Popover.Root defaultOpen>
      <Popover.Trigger asChild>{openTrigger}</Popover.Trigger>
      <Popover.Content>
        <Popover.Viewport>
          <p className='pli-2 plb-1 min-is-[18rem] max-is-[38rem]'>{children}</p>
        </Popover.Viewport>
        <Popover.Arrow />
      </Popover.Content>
    </Popover.Root>
  );
};

const meta = {
  title: 'ui/react-ui-core/Popover',
  component: Popover.Root,
  render: DefaultStory,
  decorators: [withTheme],

  parameters: { chromatic: { disableSnapshot: false } },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    openTrigger: <Button>Open popover</Button>,
    children: faker.lorem.paragraphs(3),
  },
};

export const VirtualTrigger = {
  render: () => {
    const [open, setOpen] = useState(true);
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    return (
      <>
        <Button onClick={() => setOpen(true)} ref={buttonRef}>
          Open popover
        </Button>
        <Popover.Root open={open} onOpenChange={setOpen}>
          <Popover.VirtualTrigger virtualRef={buttonRef} />
          <Popover.Content>
            <Popover.Viewport>
              <p className='pli-2 plb-1 min-is-[18rem] max-is-[38rem]'>{faker.lorem.paragraphs(3)}</p>
            </Popover.Viewport>
            <Popover.Arrow />
          </Popover.Content>
        </Popover.Root>
      </>
    );
  },
};
