//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { freehandCapabilities } from '../../model/projection.ts';
import { type NodeRegistry, defaultLinkRegistry, defaultNodeRegistry } from '../../model/registry.ts';
import { type Tool } from '../../model/types.ts';
import { Palette, type PaletteProps } from './Palette.tsx';

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

type StoryArgs = Pick<PaletteProps, 'collapse'> & {
  /** Many types in groups, or the built-in few. */
  many: boolean;
  /** The height of the view the rail floats in. */
  height: number;
};

/** The rail floating in a view of `height`, as `SceneView.Palette` places it. */
const DefaultStory = ({ collapse, many, height }: StoryArgs) => {
  const [tool, setTool] = useState<Tool>({ kind: 'select' });
  return (
    <div className='relative w-64 border border-separator rounded-sm' style={{ height }}>
      <div className='absolute top-2 bottom-2 left-2 pointer-events-none'>
        <Palette
          tool={tool}
          nodes={many ? MANY : defaultNodeRegistry}
          links={defaultLinkRegistry}
          capabilities={freehandCapabilities}
          collapse={collapse}
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
  title: 'ui/react-ui-canvas/Palette',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'centered' })],
  args: { collapse: 'auto', many: false, height: 640 },
  argTypes: { collapse: { control: 'select', options: ['auto', true, false] } },
};

export default meta;

type Story = StoryObj<StoryArgs>;

/** The built-in types: few enough that the rail stays flat. */
export const Default: Story = {};

/** Many types in a short view: the node groups fold into flyouts. */
export const Many: Story = { args: { many: true } };

/** Many types with room to spare: still flat, every tool one click away. */
export const ManyTall: Story = { args: { many: true, height: 1400 } };

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
  },
};
