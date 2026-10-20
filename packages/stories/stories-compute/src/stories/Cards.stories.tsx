//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import * as Process from '@dxos/compute/Process';
import * as Layout from '@dxos/react-ui/Layout';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { translations as reactUiTranslations } from '@dxos/react-ui/translations';

import {
  AgentTranscript,
  PermissionAgentCard,
  type PermissionLine,
  ProcessCardView,
  toolCallProgress,
} from '../components/index.ts';
import { type TranscriptEntry } from '../testing/index.ts';

const AGENT_TRANSCRIPT: TranscriptEntry[] = [
  { seq: 0, kind: 'prompt', text: 'Summarize the open pull requests.' },
  { seq: 1, kind: 'thought', text: 'I need the list of open pull requests first.' },
  { seq: 2, kind: 'tool-call', tool: 'listPullRequests', text: '{"state":"open"}' },
  { seq: 3, kind: 'tool-result', tool: 'listPullRequests', text: '3 pull requests' },
  { seq: 4, kind: 'answer', text: 'Three pull requests are open; two are waiting on review.' },
];

const READ_LINES: PermissionLine[] = [
  { kind: 'prompt', id: 'p', text: 'List the organizations.' },
  { kind: 'call', id: 'c', name: 'queryObjects', input: '{"typename":"Organization"}' },
  { kind: 'result', id: 'r', name: 'queryObjects', text: '3 objects', refused: false, failed: false },
  { kind: 'answer', id: 'a', text: 'Acme Robotics, Bramble Coffee Roasters and Lisbon Tram Company.' },
];

const REFUSED_LINES: PermissionLine[] = [
  { kind: 'prompt', id: 'p', text: 'Mark Acme Robotics as an active customer.' },
  { kind: 'call', id: 'c1', name: 'queryObjects', input: '{"name":"Acme Robotics"}' },
  { kind: 'result', id: 'r1', name: 'queryObjects', text: '1 object', refused: false, failed: false },
  { kind: 'call', id: 'c2', name: 'updateObject', input: '{"status":"active"}' },
  {
    kind: 'result',
    id: 'r2',
    name: 'updateObject',
    text: 'denied: no grant covers the subject and command',
    refused: true,
    failed: true,
  },
  { kind: 'answer', id: 'a', text: 'I do not have permission to update the organization.' },
];

const DefaultStory = () => (
  <Layout.Grid gap='md' align='start' classNames='grid-cols-[repeat(auto-fill,minmax(22rem,1fr))]'>
    <ProcessCardView
      pid='process-7f3a'
      location='local'
      state={Process.State.RUNNING}
      elapsed={42_000}
      progress='frame 12'
    >
      <div className='w-full aspect-square rounded-sm bg-black' />
    </ProcessCardView>
    <ProcessCardView
      pid='process-91c0'
      location='edge'
      state={Process.State.SUCCEEDED}
      elapsed={73_000}
      progress={toolCallProgress(AGENT_TRANSCRIPT)}
    >
      <AgentTranscript entries={AGENT_TRANSCRIPT} />
    </ProcessCardView>
    <PermissionAgentCard
      index={1}
      location='local'
      granted={['read']}
      pid='process-a12e'
      state={Process.State.SUCCEEDED}
      lines={READ_LINES}
      tools={[{ pid: 'process-a12f', key: 'org.dxos.function.space.queryObjects', state: Process.State.SUCCEEDED }]}
    />
    <PermissionAgentCard
      index={2}
      location='local'
      granted={['read']}
      pid='process-b301'
      state={Process.State.SUCCEEDED}
      lines={REFUSED_LINES}
      tools={[
        { pid: 'process-b302', key: 'org.dxos.function.space.queryObjects', state: Process.State.SUCCEEDED },
        {
          pid: 'process-b303',
          key: 'org.dxos.function.space.updateObject',
          state: Process.State.FAILED,
          refusal: 'denied: no grant covers the subject and command',
        },
      ]}
    />
    <PermissionAgentCard
      index={3}
      location='edge'
      granted={['read']}
      pid='process-c7d4'
      state={Process.State.RUNNING}
      lines={REFUSED_LINES.slice(0, 3)}
      tools={[{ pid: 'process-c7d5', key: 'org.dxos.function.space.queryObjects', state: Process.State.RUNNING }]}
    />
    <PermissionAgentCard
      index={4}
      location='local'
      granted={[]}
      error='Agent service unavailable.'
      lines={[]}
      tools={[]}
    />
  </Layout.Grid>
);

/** Each card the compute stories render, from fixed data: a process, an agent, and agents under a guard. */
const meta: Meta = {
  title: 'stories/stories-compute/Cards',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'default' })],
  parameters: { translations: [...reactUiTranslations] },
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
