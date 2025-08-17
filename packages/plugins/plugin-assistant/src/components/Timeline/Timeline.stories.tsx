//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useRef, useState } from 'react';

import { LogLevel } from '@dxos/log';
import { faker } from '@dxos/random';
import { Button, Toolbar, useInterval } from '@dxos/react-ui';
import { type ScrollController } from '@dxos/react-ui-components';
import { ColumnContainer, withLayout, withTheme } from '@dxos/storybook-utils';

import { type Commit, Timeline } from './Timeline';

faker.seed(1);

enum IconType {
  // General status.
  WARN = 'ph--warning-circle--regular',
  CHECK = 'ph--check-circle--regular',
  ROCKET = 'ph--rocket--regular',
  X = 'ph--x-circle--regular',
  FLAG = 'ph--flag--regular',
  TIMER = 'ph--timer--regular',

  // Interactions.
  USER = 'ph--user--regular',
  USER_INTERACTION = 'ph--user-sound--regular',
  AGENT = 'ph--robot--regular',
  THINK = 'ph--brain--regular',
  LINK = 'ph--link--regular',
  TOOL = 'ph--wrench--regular',
}

const generateCommits = (n: number): { commits: Commit[]; branches: string[] } => {
  const commits = [];
  const branches = ['main'];
  let lastBranch = branches[0];
  let lastCommit: string | undefined;
  const closedBranches = new Set<string>();

  for (let i = 0; i < n; i++) {
    const { commit, branch } = generateCommit(commits, branches, lastBranch, lastCommit, closedBranches);
    if (commit) {
      commits.push(commit);
      lastCommit = commit.id;
    }
    if (branch) {
      branches.push(branch);
      lastBranch = branch;
    }
  }

  return { commits, branches };
};

const generateCommit = (
  commits: Commit[],
  branches: string[],
  lastBranch: string,
  lastCommit: string | undefined,
  closedBranches: Set<string>,
): {
  commit: Commit | undefined;
  branch: string | undefined;
} => {
  let commit: Commit | undefined = undefined;
  let branch: string | undefined = undefined;

  const p = Math.random();
  if (commits.length > 3) {
    if (p < 0.2 && branches.length < 6) {
      // New branch.
      branch = faker.lorem.word();
      lastBranch = branch;
    } else if (p < 0.4) {
      // Switch branch.
      const branch = branches[Math.floor(Math.random() * branches.length)];
      if (!closedBranches.has(branch)) {
        lastBranch = branch;
      }
    } else if (p < 0.5 && branches.length > 3 && lastCommit && lastBranch !== branches[0]) {
      // Merge branch.
      closedBranches.add(lastBranch);
      const lastBranchCommit = commits.findLast((c) => c.branch === lastBranch);
      lastBranch = branches[0];
      if (lastBranchCommit) {
        commit = {
          id: faker.string.uuid(),
          branch: lastBranch,
          icon: IconType.TIMER,
          level: LogLevel.INFO,
          message: 'Merge',
          parents: [lastBranchCommit.id, lastCommit],
        };
      }
    }
  }

  if (!commit) {
    commit = {
      id: faker.string.uuid(),
      branch: lastBranch,
      icon: faker.helpers.arrayElement([
        IconType.WARN,
        IconType.CHECK,
        IconType.ROCKET,
        IconType.X,
        IconType.FLAG,
        IconType.TIMER,
        IconType.USER,
        IconType.USER_INTERACTION,
        IconType.AGENT,
      ]),
      level: faker.helpers.arrayElement([
        LogLevel.TRACE,
        LogLevel.DEBUG,
        LogLevel.VERBOSE,
        LogLevel.INFO,
        LogLevel.WARN,
        LogLevel.ERROR,
      ]),
      message: faker.lorem.paragraph(),
      parents: lastCommit ? [lastCommit] : [],
    };
  }

  return { commit, branch };
};

const meta: Meta<typeof Timeline> = {
  title: 'plugins/plugin-assistant/Timeline',
  component: Timeline,
  decorators: [
    withTheme,
    withLayout({
      Container: ColumnContainer,
      fullscreen: true,
    }),
  ],
};

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    debug: true,
    showIcon: false,
    commits: [
      { id: 'c1', message: faker.lorem.paragraph(), branch: 'main' },
      { id: 'c2', message: faker.lorem.paragraph(), branch: 'main', parents: ['c1'] },
      { id: 'c3', message: faker.lorem.paragraph(), branch: 'feature-a', parents: ['c2'] },
      { id: 'c4', message: faker.lorem.paragraph(), branch: 'main', parents: ['c2'] },
      { id: 'c5', message: faker.lorem.paragraph(), branch: 'feature-b', parents: ['c2'] },
      { id: 'c6', message: faker.lorem.paragraph(), branch: 'feature-a', parents: ['c3'] },
      { id: 'c7', message: faker.lorem.paragraph(), branch: 'feature-a', parents: ['c6'] },
      { id: 'c8', message: faker.lorem.paragraph(), branch: 'feature-c', parents: ['c6'] },
      { id: 'c9', message: faker.lorem.paragraph(), branch: 'main', parents: ['c4'] },
    ],
  },
};

export const Merge: Story = {
  args: {
    debug: true,
    showIcon: false,
    branches: ['main', 'feature-a', 'feature-b'],
    commits: [
      { id: 'c1', message: faker.lorem.paragraph(), branch: 'main' },
      { id: 'c2', message: faker.lorem.paragraph(), branch: 'main', parents: ['c1'] },
      { id: 'c3', message: faker.lorem.paragraph(), branch: 'feature-a', parents: ['c2'] },
      { id: 'c4', message: faker.lorem.paragraph(), branch: 'feature-a', parents: ['c3'] },
      { id: 'c5', message: faker.lorem.paragraph(), branch: 'feature-b', parents: ['c3'] },
      { id: 'c6', message: faker.lorem.paragraph(), branch: 'main', parents: ['c2'] },
      { id: 'c7', message: faker.lorem.paragraph(), branch: 'main', parents: ['c6', 'c4', 'c5'] },
    ],
  },
};

export const Linear: Story = {
  args: {
    branches: ['main'],
    commits: [
      { id: 'c1', message: faker.lorem.paragraph(), branch: 'main' },
      { id: 'c2', message: faker.lorem.paragraph(), branch: 'main', parents: ['c1'] },
      { id: 'c3', message: faker.lorem.paragraph(), branch: 'main', parents: ['c2'] },
      { id: 'c4', message: faker.lorem.paragraph(), branch: 'main', parents: ['c3'] },
    ],
  },
};

export const Empty: Story = {};

export const Random: Story = {
  args: generateCommits(100),
};

export const Compact: Story = {
  args: { ...generateCommits(100), compact: true },
};

export const Streaming: Story = {
  render: () => {
    const [branches, setBranches] = useState<string[]>(['main']);
    const [commits, setCommits] = useState<Commit[]>([
      {
        id: faker.string.uuid(),
        branch: branches[0],
        message: faker.lorem.paragraph(),
      },
    ]);
    const lastCommit = useRef<string | undefined>(commits[0].id);
    const lastBranch = useRef<string>(branches[0]);
    const closedBranches = useRef<Set<string>>(new Set());

    const [running, setRunning] = useState(true);
    useInterval(
      () => {
        if (!running) {
          return;
        }

        const { commit, branch } = generateCommit(
          commits,
          branches,
          lastBranch.current,
          lastCommit.current,
          closedBranches.current,
        );
        if (!commit) {
          return;
        }

        lastBranch.current = commit.branch;
        if (branch) {
          setBranches((branches) => [...branches, branch]);
        }

        lastCommit.current = commit.id;
        setCommits((commits) => [...commits, commit]);
      },
      1_000,
      [running],
    );

    const scrollerRef = useRef<ScrollController>(null);

    return (
      <div className='flex flex-col is-full bs-full overflow-hidden'>
        <Toolbar.Root>
          <Button onClick={() => setRunning(true)}>Start</Button>
          <Button onClick={() => setRunning(false)}>Stop</Button>
          <Button onClick={() => scrollerRef.current?.scrollToTop()}>Top</Button>
          <Button onClick={() => scrollerRef.current?.scrollToBottom()}>Bottom</Button>
        </Toolbar.Root>
        <Timeline ref={scrollerRef} branches={branches} commits={commits} />
      </div>
    );
  },
};
