//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { Panel } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { DEFAULT_OPERATION_TAGS, availableOperationTags } from './trace-filter';
import { TraceToolbar } from './TraceToolbar';

const available = availableOperationTags(['ui', 'edit', 'query', 'sync', 'agent', 'tool'], DEFAULT_OPERATION_TAGS);

/**
 * The toolbar in the shape the panel gives it: a bounded, scroll-clipped container. The popover has
 * to escape that, and its rows have to read as a checklist rather than a striped list — a chosen row
 * and the row under the keyboard cursor are different things.
 */
const DefaultStory = () => {
  const [selected, setSelected] = useState<readonly string[]>(DEFAULT_OPERATION_TAGS);

  return (
    <Panel.Root classNames='is-[24rem] bs-[16rem]'>
      <Panel.Toolbar asChild>
        <TraceToolbar selected={selected} available={available} onSelectedChange={setSelected} />
      </Panel.Toolbar>
      <Panel.Content classNames='p-2 text-sm text-description'>{selected.join(', ') || 'nothing shown'}</Panel.Content>
    </Panel.Root>
  );
};

const meta = {
  title: 'plugins/plugin-assistant/TraceToolbar',
  component: TraceToolbar,
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'p-2' })],
  parameters: { translations },
} satisfies Meta<typeof TraceToolbar>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { selected: [], available, onSelectedChange: () => {} } };
