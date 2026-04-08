//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Option from 'effect/Option';

import { Process } from '@dxos/functions-runtime';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { ProcessTree } from './ProcessTree';

const makeProcess = (
  overrides: Partial<Process.Info> & Pick<Process.Info, 'pid' | 'state'> & { name: string },
): Process.Info => ({
  parentPid: null,
  key: `test.process.${overrides.name}`,
  params: { name: overrides.name, target: null },
  error: null,
  startedAt: Date.now() - 10_000,
  completedAt: Option.none(),
  metrics: { wallTime: 0, inputCount: 0, outputCount: 0 },
  ...overrides,
});

const seedProcesses: Process.Info[] = [
  makeProcess({
    pid: Process.ID.make('97793611-815e-4a67-bc04-60fa67b2c987'),
    name: 'Trigger watcher',
    state: Process.State.RUNNING,
    metrics: { wallTime: 4200, inputCount: 12, outputCount: 3 },
  }),
  makeProcess({
    pid: Process.ID.make('531e9b15-57f5-472c-8cad-f81eb2a5b564'),
    parentPid: Process.ID.make('97793611-815e-4a67-bc04-60fa67b2c987'),
    name: 'Summarize document',
    state: Process.State.SUCCEEDED,
    completedAt: Option.some(Date.now() - 2_000),
    metrics: { wallTime: 1500, inputCount: 1, outputCount: 1 },
  }),
  makeProcess({
    pid: Process.ID.make('98c8d4b6-7b20-4267-a6df-4ca227bcb86d'),
    parentPid: Process.ID.make('97793611-815e-4a67-bc04-60fa67b2c987'),
    name: 'Translate content',
    state: Process.State.HYBERNATING,
    metrics: { wallTime: 800, inputCount: 1, outputCount: 0 },
  }),
  makeProcess({
    pid: Process.ID.make('4d72c688-750b-47f2-87da-8a464e141b74'),
    name: 'Data pipeline',
    state: Process.State.FAILED,
    error: 'Connection timeout',
    metrics: { wallTime: 3100, inputCount: 5, outputCount: 2 },
  }),
  makeProcess({
    pid: Process.ID.make('030098d2-4e77-4569-ae77-1c6c34bf0136'),
    name: 'Idle listener',
    state: Process.State.IDLE,
  }),
  makeProcess({
    pid: Process.ID.make('0c4dca89-0e13-4ad7-aa7a-d10deb8333ed'),
    name: 'Shutting down',
    state: Process.State.TERMINATING,
  }),
  makeProcess({
    pid: Process.ID.make('1620e57f-c9bf-4b76-b3b3-10f96c36a8b3'),
    name: 'Completed cleanup',
    state: Process.State.TERMINATED,
    completedAt: Option.some(Date.now() - 5_000),
  }),
];

const meta: Meta<typeof ProcessTree> = {
  title: 'plugins/plugin-assistant/components/ProcessTree',
  component: ProcessTree,
  decorators: [withLayout({ layout: 'column', classNames: 'w-(--dx-complementary-sidebar-size)' }), withTheme()],
} satisfies Meta<typeof ProcessTree>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    processes: seedProcesses,
  },
};

export const AllRunning: Story = {
  args: {
    processes: [
      makeProcess({
        pid: Process.ID.make('1344bac8-745b-44a6-9af6-dc19509a7844'),
        name: 'Agent alpha',
        state: Process.State.RUNNING,
      }),
      makeProcess({
        pid: Process.ID.make('b7c9787a-6705-47dc-a197-d37f1adfa338'),
        name: 'Agent beta',
        state: Process.State.RUNNING,
      }),
      makeProcess({
        pid: Process.ID.make('43493533-a94c-4072-b18f-c0e0fd806bf5'),
        name: 'Agent gamma',
        state: Process.State.RUNNING,
      }),
    ],
  },
};
