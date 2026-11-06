//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import {
  type NodeRegistry,
  type Tool,
  defaultLinkRegistry,
  defaultNodeRegistry,
  freehandCapabilities,
} from '@dxos/react-ui-canvas';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { ToolsPanel, type ToolsPanelProps } from './ToolsPanel.tsx';

const ICONS = [
  'ph--brain--regular',
  'ph--function--regular',
  'ph--database--regular',
  'ph--image--regular',
  'ph--git-fork--regular',
  'ph--intersect--regular',
  'ph--shuffle--regular',
  'ph--code--regular',
];

/** Many node types in four groups, as a host with a large registry (the compute shapes) has. */
const MANY: NodeRegistry = Object.fromEntries(
  ['Inputs', 'Transform', 'Operations', 'Outputs'].flatMap((group, groupIndex) =>
    Array.from({ length: 6 }, (_, index) => {
      const type = `${group.toLowerCase()}-${index}`;
      return [
        type,
        {
          ...defaultNodeRegistry.rect,
          type,
          key: undefined,
          name: `${group} ${index + 1}`,
          icon: ICONS[(groupIndex * 6 + index) % ICONS.length],
          group,
        },
      ];
    }),
  ),
);

type StoryArgs = Pick<ToolsPanelProps, 'collapse' | 'flyout'> & {
  /** Many types in groups, or the built-in few. */
  many: boolean;
  /** The height of the view the rail floats in. */
  height: number;
  /** The tools group ends with the read-only lock, a button the groups do not list. */
  lockable?: boolean;
};

/** The rail floating in a view of `height`, as `Canvas.Tools` places it. */
const DefaultStory = ({ collapse, flyout, many, height, lockable }: StoryArgs) => {
  const [tool, setTool] = useState<Tool>({ kind: 'select' });
  const [readonly, setReadonly] = useState(false);
  return (
    <div className='relative w-64 border border-separator rounded-sm' style={{ height }}>
      <div className='absolute top-2 bottom-2 left-2 pointer-events-none' data-testid='palette-frame'>
        <ToolsPanel
          tool={tool}
          nodes={many ? MANY : defaultNodeRegistry}
          links={defaultLinkRegistry}
          capabilities={freehandCapabilities}
          collapse={collapse}
          flyout={flyout}
          readonly={readonly}
          onReadonlyChange={lockable ? setReadonly : undefined}
          onToolChange={setTool}
        />
      </div>
      <div className='absolute bottom-2 right-2 text-xs text-fg-muted' data-testid='palette-tool'>
        {'type' in tool ? tool.type : tool.kind}
      </div>
    </div>
  );
};

const meta: Meta<StoryArgs> = {
  title: 'ui/react-ui-canvas-editor/components/panels/ToolsPanel',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
  args: { collapse: 'auto', flyout: 'list', many: false, height: 640 },
  argTypes: {
    collapse: { control: 'select', options: ['auto', true, false] },
    flyout: { control: 'select', options: ['list', 'grid'] },
  },
};

export default meta;

type Story = StoryObj<StoryArgs>;

/** The built-in types: few enough that the rail stays flat. */
export const Default: Story = {};

/** Many types in a short view: the node groups fold into flyouts. */
export const Many: Story = { args: { many: true } };

/** Many types folded, each group's tools as a grid of icons rather than a list. */
export const ManyGrid: Story = { args: { many: true, flyout: 'grid' } };

/** Many types with room to spare: still flat, every tool one click away. */
export const ManyTall: Story = { args: { many: true, height: 1400 } };

/**
 * A view too short for even the folded rail: the rail stays inside the room its host gives it, scrolling rather than
 * running under what sits below it, and counts the buttons a group ends with when deciding to fold.
 */
export const Short: Story = {
  args: { many: true, lockable: true, height: 200 },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const frame = canvas.getByTestId('palette-frame').getBoundingClientRect();
    // 1. The rail ends within its frame.
    await waitFor(() =>
      expect(canvas.getByTestId('palette').getBoundingClientRect().bottom).toBeLessThanOrEqual(frame.bottom),
    );
    // 2. The last button, once scrolled to, is the one a click at its middle reaches.
    const lock = canvas.getByTestId('palette-readonly');
    lock.scrollIntoView({ block: 'nearest' });
    const rect = lock.getBoundingClientRect();
    const hit = canvasElement.ownerDocument.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    await expect(hit !== null && lock.contains(hit)).toBe(true);
  },
};

/** A folded group picks its face, opens its grid, and shows the tool picked from it. */
export const Test: Story = {
  args: { many: true },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // 1. The rail folds: one button per node group.
    await waitFor(() => expect(canvas.getByTestId('palette')).toHaveAttribute('data-collapsed'));
    // 2. The group's face picks its first tool.
    await userEvent.click(within(canvas.getByTestId('palette-group-Transform')).getAllByRole('button')[0]);
    await expect(canvas.getByTestId('palette-tool')).toHaveTextContent('transform-0');
    // 3. The chevron opens the group's grid; a pick there selects it and becomes the face.
    await userEvent.click(canvas.getByTestId('palette-group-Transform-open'));
    const tools = await within(canvasElement.ownerDocument.body).findByTestId('palette-group-Transform-tools');
    await userEvent.click(within(tools).getByTestId('palette-transform-3'));
    await expect(canvas.getByTestId('palette-tool')).toHaveTextContent('transform-3');
    await waitFor(() =>
      expect(
        within(canvas.getByTestId('palette-group-Transform')).getByTestId('palette-transform-3'),
      ).toBeInTheDocument(),
    );

    // 4. Resting the pointer on a folded group opens its grid.
    await userEvent.hover(canvas.getByTestId('palette-group-Outputs'));
    await expect(
      await within(canvasElement.ownerDocument.body).findByTestId(
        'palette-group-Outputs-tools',
        {},
        { timeout: 2_000 },
      ),
    ).toBeInTheDocument();
  },
};
