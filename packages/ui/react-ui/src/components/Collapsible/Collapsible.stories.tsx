<<<<<<< HEAD
//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useState } from 'react';

import { random } from '@dxos/random';

import { withTheme } from '../../testing';
import { Button } from '../Button';
import { Collapsible } from './Collapsible';

type Section = {
  id: string;
  title: string;
  body: string;
};

const sections: Section[] = ['Delivery', 'Payment', 'Returns'].map((title) => ({
  id: title.toLowerCase(),
  title,
  body: random.lorem.paragraph(2),
}));

type StoryArgs = {
  /** Fold every section but the one most recently opened, as a set of exclusive tabs would. */
  exclusive?: boolean;
};

/**
 * A stack of independent Collapsibles under one caller-owned expansion set — the accordion pattern,
 * without an accordion machine, so the stack can be rendered by anything (a virtualized list, a
 * drag-and-drop stack) rather than having to be a single element's children.
 */
const DefaultStory = ({ exclusive }: StoryArgs) => {
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set([sections[0].id]));

  const handleOpenChange = useCallback(
    (id: string, next: boolean) =>
      setOpen((prev) => {
        const ids = exclusive ? new Set<string>() : new Set(prev);
        if (next) {
          ids.add(id);
        } else {
          ids.delete(id);
        }
        return ids;
      }),
    [exclusive],
  );

  return (
    <div className='flex flex-col gap-2 w-full max-w-lg p-4'>
      <div className='flex gap-2'>
        <Button onClick={() => setOpen(new Set(sections.map(({ id }) => id)))}>Expand all</Button>
        <Button onClick={() => setOpen(new Set())}>Collapse all</Button>
      </div>
      {sections.map(({ id, title, body }) => (
        <Collapsible.Root
          key={id}
          classNames='border border-separator rounded p-2'
          open={open.has(id)}
          onOpenChange={(next) => handleOpenChange(id, next)}
          lazyMount
          unmountOnExit
        >
          <h2 className='text-lg'>
            <Collapsible.Trigger>{title}</Collapsible.Trigger>
          </h2>
          <Collapsible.Content>
            <p className='pt-2 text-description'>{body}</p>
          </Collapsible.Content>
        </Collapsible.Root>
      ))}
    </div>
  );
};

// No `component`: the stories render `DefaultStory`, whose args are the controls; naming the
// primitive made storybook infer them from `Collapsible.Root` instead — and needed a cast to do it.
const meta = {
  title: 'ui/react-ui-core/components/Collapsible',
  render: DefaultStory,
  decorators: [withTheme()],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { exclusive: false },
};

/** One section at a time. */
export const Exclusive: Story = {
  args: { exclusive: true },
};

/**
 * The section is a subgrid row of the column template its heading shares — the shape a message tile
 * or any other record-with-detail takes. The section's own columns must not re-solve while its height
 * animates, or the detail visibly shifts under the heading instead of being wiped away.
 */
export const Subgrid: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <div className='w-full max-w-lg p-4'>
        <Collapsible.Root asChild open={open} onOpenChange={setOpen}>
          <div className='grid grid-cols-[auto_1fr_auto] border border-separator rounded p-2'>
            <span className='px-2'>◆</span>
            <h2 className='col-start-2 text-lg'>
              <Collapsible.Trigger>{sections[0].title}</Collapsible.Trigger>
            </h2>
            <span className='col-start-3 px-2 text-description'>12:04</span>
            <Collapsible.Content asChild>
              {/* Two rows, as a record's detail and its body are: the pair the collapse must hold
                  apart, since a grid asked to shrink closes the space between its rows first. */}
              <div className='col-span-full grid grid-cols-subgrid items-start'>
                <span className='px-2 text-description'>↳</span>
                <span data-testid='detail' className='col-start-2 col-span-2 text-sm text-description'>
                  someone@example.com
                </span>
                <p data-testid='body' className='col-start-2 col-span-2 pt-2 text-description'>
                  {sections[0].body}
                </p>
              </div>
            </Collapsible.Content>
          </div>
        </Collapsible.Root>
      </div>
    );
  },
};

/** Nothing to fold: the trigger keeps the heading's box but stops being a control. */
export const Disabled: Story = {
  render: () => (
    <div className='flex flex-col gap-2 w-full max-w-lg p-4'>
      <Collapsible.Root classNames='border border-separator rounded p-2' open disabled>
        <h2 className='text-lg'>
          <Collapsible.Trigger>{sections[0].title}</Collapsible.Trigger>
        </h2>
        <Collapsible.Content>
          <p className='pt-2 text-description'>{sections[0].body}</p>
        </Collapsible.Content>
      </Collapsible.Root>
    </div>
  ),
};
||||||| 72e76c9b8d
=======
//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback, useState } from 'react';

import { random } from '@dxos/random';

import { withTheme } from '../../testing';
import { Button } from '../Button';
import { Collapsible } from './Collapsible';

type Section = {
  id: string;
  title: string;
  body: string;
};

const sections: Section[] = ['Delivery', 'Payment', 'Returns'].map((title) => ({
  id: title.toLowerCase(),
  title,
  body: random.lorem.paragraph(2),
}));

type StoryArgs = {
  /** Fold every section but the one most recently opened, as a set of exclusive tabs would. */
  exclusive?: boolean;
};

/**
 * A stack of independent Collapsibles under one caller-owned expansion set — the accordion pattern,
 * without an accordion machine, so the stack can be rendered by anything (a virtualized list, a
 * drag-and-drop stack) rather than having to be a single element's children.
 */
const DefaultStory = ({ exclusive }: StoryArgs) => {
  const [open, setOpen] = useState<ReadonlySet<string>>(() => new Set([sections[0].id]));

  const handleOpenChange = useCallback(
    (id: string, next: boolean) =>
      setOpen((prev) => {
        const ids = exclusive ? new Set<string>() : new Set(prev);
        if (next) {
          ids.add(id);
        } else {
          ids.delete(id);
        }
        return ids;
      }),
    [exclusive],
  );

  return (
    <div className='flex flex-col gap-2 w-full max-w-lg p-4'>
      <div className='flex gap-2'>
        <Button onClick={() => setOpen(new Set(sections.map(({ id }) => id)))}>Expand all</Button>
        <Button onClick={() => setOpen(new Set())}>Collapse all</Button>
      </div>
      {sections.map(({ id, title, body }) => (
        <Collapsible.Root
          key={id}
          classNames='border border-separator rounded p-2'
          open={open.has(id)}
          onOpenChange={(next) => handleOpenChange(id, next)}
          lazyMount
          unmountOnExit
        >
          <h2 className='text-lg'>
            <Collapsible.Trigger>{title}</Collapsible.Trigger>
          </h2>
          <Collapsible.Content>
            <p className='pt-2 text-description'>{body}</p>
          </Collapsible.Content>
        </Collapsible.Root>
      ))}
    </div>
  );
};

const meta = {
  title: 'ui/react-ui-core/components/Collapsible',
  component: Collapsible.Root as any,
  render: DefaultStory,
  decorators: [withTheme()],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { exclusive: false },
};

/** One section at a time. */
export const Exclusive: Story = {
  args: { exclusive: true },
};

/**
 * The section is a subgrid row of the column template its heading shares — the shape a message tile
 * or any other record-with-detail takes. The section's own columns must not re-solve while its height
 * animates, or the detail visibly shifts under the heading instead of being wiped away.
 */
export const Subgrid: Story = {
  render: () => {
    const [open, setOpen] = useState(true);
    return (
      <div className='w-full max-w-lg p-4'>
        <Collapsible.Root asChild open={open} onOpenChange={setOpen}>
          <div className='grid grid-cols-[auto_1fr_auto] border border-separator rounded p-2'>
            <span className='px-2'>◆</span>
            <h2 className='col-start-2 text-lg'>
              <Collapsible.Trigger>{sections[0].title}</Collapsible.Trigger>
            </h2>
            <span className='col-start-3 px-2 text-description'>12:04</span>
            <Collapsible.Content asChild>
              {/* Two rows, as a record's detail and its body are: the pair the collapse must hold
                  apart, since a grid asked to shrink closes the space between its rows first. */}
              <div className='col-span-full grid grid-cols-subgrid items-start'>
                <span className='px-2 text-description'>↳</span>
                <span data-testid='detail' className='col-start-2 col-span-2 text-sm text-description'>
                  someone@example.com
                </span>
                <p data-testid='body' className='col-start-2 col-span-2 pt-2 text-description'>
                  {sections[0].body}
                </p>
              </div>
            </Collapsible.Content>
          </div>
        </Collapsible.Root>
      </div>
    );
  },
};

/** Nothing to fold: the trigger keeps the heading's box but stops being a control. */
export const Disabled: Story = {
  render: () => (
    <div className='flex flex-col gap-2 w-full max-w-lg p-4'>
      <Collapsible.Root classNames='border border-separator rounded p-2' open disabled>
        <h2 className='text-lg'>
          <Collapsible.Trigger>{sections[0].title}</Collapsible.Trigger>
        </h2>
        <Collapsible.Content>
          <p className='pt-2 text-description'>{sections[0].body}</p>
        </Collapsible.Content>
      </Collapsible.Root>
    </div>
  ),
};
>>>>>>> origin/main
