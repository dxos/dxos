//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { withTheme } from '@dxos/react-ui/testing';

import { TraceView } from './TraceView';
import { type State } from './types';

const meta = {
  title: 'devtools/devtools/TraceView',
  component: TraceView,
  decorators: [withTheme],
} satisfies Meta<typeof TraceView>;

export default meta;

type Story = StoryObj<typeof meta>;

const state: State = {
  resources: new Map([
    [
      1,
      {
        resource: {
          id: 1,
          className: 'TestResource',
          instanceId: 1,
          info: { fields: {} },
          links: [],
          metrics: [],
        },
        spans: [
          { id: 1, startTs: '0', endTs: '100', methodName: 'root1', resourceId: 1 },
          { id: 3, startTs: '10', endTs: '50', methodName: 'child1', parentId: 1, resourceId: 1 },
        ],
        logs: [],
      },
    ],
    [
      2,
      {
        resource: {
          id: 2,
          className: 'TestResource',
          instanceId: 2,
          info: { fields: {} },
          links: [],
          metrics: [],
        },
        spans: [
          { id: 2, startTs: '50', endTs: '150', methodName: 'root2', resourceId: 2 },
          { id: 4, startTs: '60', endTs: '120', methodName: 'child2', parentId: 2, resourceId: 2 },
        ],
        logs: [],
      },
    ],
  ]),
  spans: new Map([
    [1, { id: 1, startTs: '0', endTs: '100', methodName: 'root1', resourceId: 1 }],
    [2, { id: 2, startTs: '50', endTs: '150', methodName: 'root2', resourceId: 2 }],
    [3, { id: 3, startTs: '10', endTs: '50', methodName: 'child1', parentId: 1, resourceId: 1 }],
    [4, { id: 4, startTs: '60', endTs: '120', methodName: 'child2', parentId: 2, resourceId: 2 }],
  ]),
};

export const Default: Story = {
  args: { state },
};

// Example with a specific resource view
export const SingleResource: Story = {
  args: { state, resourceId: 1 },
};
