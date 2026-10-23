//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import * as Button from '@dxos/react-ui/Button';
import * as Panel from '@dxos/react-ui/Panel';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { Columns, type ColumnsProps } from './Columns.tsx';

type StoryProps = Pick<ColumnsProps, 'minColumnWidth' | 'maxColumns' | 'gap'> & { initial: number };

/** Columns fill the space in exact shares; adding one past what fits scrolls it into view. */
const DefaultStory = ({ initial, ...props }: StoryProps) => {
  const [count, setCount] = useState(initial);
  return (
    <Panel.Root>
      <Panel.Header>
        <Toolbar.Root>
          <Button.Root onClick={() => setCount((value) => value + 1)}>Add column</Button.Root>
          <Button.Root onClick={() => setCount((value) => Math.max(1, value - 1))}>Remove column</Button.Root>
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body asChild>
        <Columns {...props}>
          {Array.from({ length: count }, (_, index) => (
            <Panel.Root key={index} data-testid='column'>
              <Panel.Header>
                <Toolbar.Root>
                  <Toolbar.Text>Column {index + 1}</Toolbar.Text>
                </Toolbar.Root>
              </Panel.Header>
            </Panel.Root>
          ))}
        </Columns>
      </Panel.Body>
    </Panel.Root>
  );
};

const meta = {
  title: 'ui/react-ui-core/layout/Columns',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: { initial: 1, minColumnWidth: 24, gap: 0.5 },
};

export const MaxTwo: Story = {
  args: { initial: 3, minColumnWidth: 16, maxColumns: 2, gap: 0.5 },
};
