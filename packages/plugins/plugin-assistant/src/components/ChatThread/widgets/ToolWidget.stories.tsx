//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { type ContentBlock } from '@dxos/types';

import { translations } from '../../../translations';
import { ToolWidget, type ToolWidgetProps } from './ToolWidget';

const baseWidgetProps = {
  _tag: 'toolCall',
  range: { from: 0, to: 1 },
} satisfies Pick<ToolWidgetProps, '_tag' | 'range'>;

const toolCallAndResult: ContentBlock.Any[] = [
  {
    _tag: 'toolCall',
    toolCallId: 'tc-story-1',
    name: 'example_tool',
    input: JSON.stringify({ query: 'status', limit: 10 }),
    providerExecuted: false,
  },
  {
    _tag: 'toolResult',
    toolCallId: 'tc-story-1',
    name: 'example_tool',
    result: JSON.stringify({ ok: true, rows: [{ id: 1 }, { id: 2 }] }),
    providerExecuted: false,
  },
];

const meta = {
  title: 'plugins/plugin-assistant/components/ChatThread/widgets/ToolWidget',
  component: ToolWidget,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof ToolWidget>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    ...baseWidgetProps,
    blocks: toolCallAndResult,
  },
};
