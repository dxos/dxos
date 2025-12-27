//
// Copyright 2025 DXOS.org
//

import {
  useArrowNavigationGroup,
  useFocusFinders,
  useFocusableGroup,
  useMergedTabsterAttributes_unstable,
} from '@fluentui/react-tabster';
import { type Decorator, type Meta, type StoryObj } from '@storybook/react-vite';
import React, { forwardRef, useEffect, useMemo, useRef } from 'react';
import { createTabster, disposeTabster } from 'tabster';

import { Input } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { mx } from '@dxos/ui-theme';

// TODO(burdon): Factor out styles (incl. tabster debugging).
// TODO(burdon): Implement horizontal movement between columns when column is selected.
// TODO(burdon): Prevent tab out of app.

const border =
  'rounded-sm outline-none border border-subduedSeparator focus:border-primary-500 focus-within:border-rose-500';

const Board = forwardRef<HTMLDivElement, { columns: string[][] }>(({ columns }, ref) => {
  const arrowNavigationAttrs = useArrowNavigationGroup({ axis: 'horizontal', memorizeCurrent: true });

  return (
    <div ref={ref} tabIndex={0} {...arrowNavigationAttrs} className='flex bs-full is-full overflow-hidden'>
      <div className={mx('flex bs-full overflow-x-auto p-4 gap-4')}>
        {columns.map((column) => (
          <Column key={column[0]} items={column} />
        ))}
      </div>
    </div>
  );
});

const Column = forwardRef<HTMLDivElement, { items: string[] }>(({ items }, ref) => {
  const focusableGroupAttrs = useFocusableGroup({ tabBehavior: 'limited' });
  const arrowNavigationAttrs = useArrowNavigationGroup({ axis: 'vertical', memorizeCurrent: true });
  const tabsterAttrs = useMergedTabsterAttributes_unstable(focusableGroupAttrs, arrowNavigationAttrs);

  return (
    <div
      ref={ref}
      tabIndex={0}
      {...tabsterAttrs}
      className={mx('flex flex-col shrink-0 bs-full is-[25rem] overflow-y-auto p-4 gap-4', border)}
    >
      {items.map((item) => (
        <Item key={item} value={item} />
      ))}
    </div>
  );
});

const Item = forwardRef<HTMLDivElement, { value: string }>(({ value }, ref) => {
  const focusableGroupAttrs = useFocusableGroup();

  return (
    <div ref={ref} tabIndex={0} {...focusableGroupAttrs} className={mx('flex is-full gap-4 p-4 items-center', border)}>
      <Input.Root>
        <Input.Checkbox />
      </Input.Root>
      <Input.Root>
        <Input.TextInput defaultValue={value} />
      </Input.Root>
    </div>
  );
});

const DefaultStory = () => {
  const columns = useMemo(() => {
    return [['A1', 'A2', 'A3'], ['B1'], ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'], ['D1', 'D2']];
  }, []);

  const ref = useRef<HTMLDivElement>(null);
  const { findFirstFocusable } = useFocusFinders();
  useEffect(() => {
    if (ref.current) {
      findFirstFocusable(ref.current)?.focus();
    }
  }, []);

  return <Board columns={columns} ref={ref} />;
};

// TODO(burdon): This doesn't seem to be necessary or recongized; memoization doesn't work.
const withTabster: Decorator = (Story) => {
  useEffect(() => {
    const tabster = createTabster(window, {
      autoRoot: {},
      // TODO(burdon): Not called.
      // checkUncontrolledCompletely: (el) => {
      //   console.log(el);
      //   return true;
      // },
    });

    return () => {
      disposeTabster(tabster);
    };
  }, []);

  return <Story />;
};

const meta: Meta<typeof DefaultStory> = {
  title: 'ui/react-ui-mosaic/tabster',
  component: DefaultStory,
  decorators: [withTheme, withLayout({ layout: 'fullscreen' }), withTabster],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {},
};
