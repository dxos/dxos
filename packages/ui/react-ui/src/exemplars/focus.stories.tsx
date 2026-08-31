//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { forwardRef, useEffect, useMemo, useRef } from 'react';

import { Input, ScrollArea, useMergeRefs } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { mx } from '@dxos/ui-theme';

import { useFocusGroup } from '../hooks';
import { findFirstFocusable } from '../util';

// TODO(burdon): Implement horizontal movement between columns when column is selected.
// TODO(burdon): Prevent tab out of app.

const border =
  'rounded-xs outline-hidden border border-subdued-separator focus:border-primary-500 focus-within:border-rose-500';

/** Horizontal group over the columns; each column is one stop. */
const Board = forwardRef<HTMLDivElement, { columns: string[][] }>(({ columns }, ref) => {
  const { ref: focusGroupRef, ...focusGroupProps } = useFocusGroup({
    axis: 'horizontal',
    memorizeCurrent: true,
    tabbable: true,
  });

  return (
    <div
      ref={useMergeRefs<HTMLDivElement>([ref, focusGroupRef])}
      tabIndex={0}
      {...focusGroupProps}
      className='flex h-full w-full overflow-hidden'
    >
      <div className={mx('flex h-full overflow-x-auto p-4 gap-4')}>
        {columns.map((column) => (
          <Column key={column[0]} items={column} />
        ))}
      </div>
    </div>
  );
});

/** Vertical group over the items, entered with Enter and left with Escape. */
const Column = ({ items }: { items: string[] }) => {
  const { ref: focusGroupRef, ...focusGroupProps } = useFocusGroup({
    axis: 'vertical',
    tabBehavior: 'limited',
    memorizeCurrent: true,
  });

  return (
    <ScrollArea.Root orientation='vertical' classNames={mx('w-[25rem]', border)}>
      <ScrollArea.Viewport classNames='p-4'>
        <div {...focusGroupProps} tabIndex={0} className='flex flex-col gap-4' ref={focusGroupRef}>
          {items.map((item) => (
            <Item key={item} value={item} />
          ))}
        </div>
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
};

/** One stop for the column's arrow keys, holding controls of its own. */
const Item = ({ value }: { value: string }) => {
  const { ref: focusGroupRef, ...focusGroupProps } = useFocusGroup({ tabBehavior: 'unlimited' });

  return (
    <div
      ref={focusGroupRef}
      tabIndex={0}
      {...focusGroupProps}
      className={mx('flex shrink-0 w-full gap-4 p-4 items-center', border)}
    >
      <Input.Root>
        <Input.Checkbox />
      </Input.Root>
      <Input.Root>
        <Input.TextInput defaultValue={value} />
      </Input.Root>
    </div>
  );
};

const DefaultStory = () => {
  const columns = useMemo(() => {
    return [['A1', 'A2', 'A3'], ['B1'], ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'], ['D1', 'D2']];
  }, []);

  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    findFirstFocusable(ref.current)?.focus();
  }, []);

  return <Board columns={columns} ref={ref} />;
};

const meta: Meta<typeof DefaultStory> = {
  title: 'ui/react-ui-core/exemplars/focus',
  component: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
