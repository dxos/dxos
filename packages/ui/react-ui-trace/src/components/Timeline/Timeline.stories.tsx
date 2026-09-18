//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useRef, useState } from 'react';
import { expect, userEvent, waitFor } from 'storybook/test';

import { LogLevel } from '@dxos/log';
import { random } from '@dxos/random';
import { Button, Panel, ScrollArea, ScrollContainer, Toolbar, useInterval } from '@dxos/react-ui';
import { type ScrollController } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { defaultOptions } from './timeline-options.ts';
import { type Commit, Timeline, TimelineProps } from './Timeline.tsx';

random.seed(1);

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
  AGENT = 'ph--drone--regular',
  THINK = 'ph--brain--regular',
  LINK = 'ph--link--regular',
  TOOL = 'ph--wrench--regular',
}

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
      branch = random.lorem.word();
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
          id: random.string.uuid(),
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
      id: random.string.uuid(),
      timestamp: new Date(),
      branch: lastBranch,
      icon: random.helpers.arrayElement([
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
      level: random.helpers.arrayElement([
        LogLevel.TRACE,
        LogLevel.DEBUG,
        LogLevel.VERBOSE,
        LogLevel.INFO,
        LogLevel.WARN,
        LogLevel.ERROR,
      ]),
      message: random.lorem.paragraph(),
      parents: lastCommit ? [lastCommit] : [],
    };
  }

  return { commit, branch };
};

const generateCommits = (n: number): Pick<TimelineProps, 'commits' | 'branches'> => {
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

const DefaultStory = (props: Omit<TimelineProps, 'scroller'>) => {
  const [viewport, setViewport] = useState<HTMLDivElement | null>(null);

  return (
    <ScrollArea.Root>
      <ScrollArea.Viewport ref={setViewport}>
        <Timeline {...props} scroller={viewport} />
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
};

const meta = {
  title: 'ui/react-ui-trace/Timeline',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column', classNames: 'w-(--dx-complementary-sidebar-size)' })],
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    debug: true,
    showIcon: false,
    commits: [
      { id: 'c1', message: random.lorem.paragraph(), branch: 'main' },
      { id: 'c2', message: random.lorem.paragraph(), branch: 'main', parents: ['c1'] },
      { id: 'c3', message: random.lorem.paragraph(), branch: 'feature-a', parents: ['c2'] },
      { id: 'c4', message: random.lorem.paragraph(), branch: 'main', parents: ['c2'] },
      { id: 'c5', message: random.lorem.paragraph(), branch: 'feature-b', parents: ['c2'] },
      { id: 'c6', message: random.lorem.paragraph(), branch: 'feature-a', parents: ['c3'] },
      { id: 'c7', message: random.lorem.paragraph(), branch: 'feature-a', parents: ['c6'] },
      { id: 'c8', message: random.lorem.paragraph(), branch: 'feature-c', parents: ['c6'] },
      { id: 'c9', message: random.lorem.paragraph(), branch: 'main', parents: ['c4'] },
    ],
  },
};

export const Branch: Story = {
  args: {
    debug: true,
    showIcon: false,
    commits: [
      { id: 'c1', message: random.lorem.paragraph(), branch: 'main' },
      { id: 'c2', message: random.lorem.paragraph(), branch: 'main', parents: ['c1'] },
      { id: 'c3', message: random.lorem.paragraph(), branch: 'feature-a', parents: ['c2'] },
    ],
  },
};

export const Timestamp: Story = {
  args: {
    debug: true,
    showIcon: false,
    showTimestamp: true,
    commits: [
      {
        id: 'c1',
        timestamp: new Date(Date.now()),
        message: random.lorem.paragraph(),
        branch: 'main',
      },
      {
        id: 'c2',
        timestamp: new Date(Date.now() + 100),
        message: random.lorem.paragraph(),
        branch: 'main',
        parents: ['c1'],
      },
      {
        id: 'c3',
        timestamp: new Date(Date.now() + 120),
        message: random.lorem.paragraph(),
        branch: 'feature-a',
        parents: ['c2'],
      },
    ],
  },
};

export const Merge: Story = {
  args: {
    debug: true,
    showIcon: false,
    branches: ['main', 'feature-a', 'feature-b'],
    commits: [
      { id: 'c1', message: random.lorem.paragraph(), branch: 'main' },
      { id: 'c2', message: random.lorem.paragraph(), branch: 'main', parents: ['c1'] },
      { id: 'c3', message: random.lorem.paragraph(), branch: 'feature-a', parents: ['c2'] },
      { id: 'c4', message: random.lorem.paragraph(), branch: 'feature-a', parents: ['c3'] },
      { id: 'c5', message: random.lorem.paragraph(), branch: 'feature-b', parents: ['c3'] },
      { id: 'c6', message: random.lorem.paragraph(), branch: 'main', parents: ['c2'] },
      { id: 'c7', message: random.lorem.paragraph(), branch: 'main', parents: ['c6', 'c4', 'c5'] },
    ],
  },
};

export const Linear: Story = {
  args: {
    branches: ['main'],
    commits: [
      { id: 'c1', message: random.lorem.paragraph(), branch: 'main' },
      { id: 'c2', message: random.lorem.paragraph(), branch: 'main', parents: ['c1'] },
      { id: 'c3', message: random.lorem.paragraph(), branch: 'main', parents: ['c2'] },
      { id: 'c4', message: random.lorem.paragraph(), branch: 'main', parents: ['c3'] },
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

/** A history far longer than any viewport; only the rows in view are in the DOM. */
const LARGE_HISTORY_LENGTH = 5_000;

const generateLargeHistory = (): Pick<TimelineProps, 'commits' | 'branches'> => {
  const branches = ['main', 'worker'];
  const commits: Commit[] = [];
  for (let index = 0; index < LARGE_HISTORY_LENGTH; index++) {
    const branch = index % 20 < 4 ? 'worker' : 'main';
    commits.push({
      id: `commit-${index}`,
      branch,
      message: `Commit ${index}`,
      parents: index > 0 ? [`commit-${index - 1}`] : [],
    });
  }

  return { commits, branches };
};

const mountedRows = (canvasElement: HTMLElement) => canvasElement.querySelectorAll<HTMLElement>('[role="listitem"]');

export const Large: Story = {
  args: { ...generateLargeHistory(), showTimestamp: true },
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(mountedRows(canvasElement).length).toBeGreaterThan(0));

    const rows = mountedRows(canvasElement);
    // Windowed: a viewport's worth of rows plus the overscan, never the whole history.
    await expect(rows.length).toBeLessThan(LARGE_HISTORY_LENGTH / 10);
    // Rows are exactly `lineHeight` tall, which is what makes the declared extent exact.
    for (const row of rows) {
      await expect(row.getBoundingClientRect().height).toBe(defaultOptions.lineHeight);
    }
  },
};

/**
 * Windowing must not cost the graph: a row deep in the history still draws every lane crossing it,
 * because the spans it reads are computed over the whole history, not over the mounted rows.
 */
export const Branching: Story = {
  args: generateLargeHistory(),
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(mountedRows(canvasElement).length).toBeGreaterThan(0));

    // Jump to the end, so every mounted row was windowed in rather than rendered at mount.
    const timeline = canvasElement.querySelector<HTMLElement>('[tabindex="0"]');
    timeline?.focus();
    await userEvent.keyboard('{Meta>}{ArrowDown}{/Meta}');
    await waitFor(() =>
      expect(canvasElement.querySelector(`[data-commit-index="${LARGE_HISTORY_LENGTH - 1}"]`)).not.toBeNull(),
    );

    const rows = [...mountedRows(canvasElement)];
    // Each row carries its own node, and a connector for every lane that runs through it.
    const nodesPerRow = rows.map((row) => row.querySelectorAll('svg circle').length);
    await expect(Math.min(...nodesPerRow)).toBeGreaterThan(0);
    // Somewhere in the window a second lane is open, so its through-line is drawn beside the node.
    const connectorsPerRow = rows.map((row) => row.querySelectorAll('svg path').length);
    await expect(Math.max(...connectorsPerRow)).toBeGreaterThan(1);
  },
};

export const Keyboard: Story = {
  args: generateLargeHistory(),
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(mountedRows(canvasElement).length).toBeGreaterThan(0));

    // The last row is thousands of rows down, so it is only reachable if the move scrolls to it.
    const timeline = canvasElement.querySelector<HTMLElement>('[tabindex="0"]');
    await expect(timeline).not.toBeNull();
    timeline?.focus();
    await userEvent.keyboard('{Meta>}{ArrowDown}{/Meta}');

    const lastRow = () => canvasElement.querySelector(`[data-commit-index="${LARGE_HISTORY_LENGTH - 1}"]`);
    await waitFor(() => expect(lastRow()).not.toBeNull());
    await waitFor(() => expect(lastRow()?.getAttribute('aria-current')).toBe('true'));
  },
};

export const Streaming: Story = {
  render: () => {
    const [branches, setBranches] = useState<string[]>(['main']);
    const [commits, setCommits] = useState<Commit[]>([
      {
        id: random.string.uuid(),
        branch: branches[0],
        message: random.lorem.paragraph(),
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
    const [viewport, setViewport] = useState<HTMLDivElement | null>(null);

    return (
      <Panel.Root>
        <Panel.Toolbar asChild>
          <Toolbar.Root>
            <Button onClick={() => setRunning(true)}>Start</Button>
            <Button onClick={() => setRunning(false)}>Stop</Button>
            <Button onClick={() => scrollerRef.current?.scrollToTop()}>Top</Button>
            <Button onClick={() => scrollerRef.current?.scrollToBottom()}>Bottom</Button>
          </Toolbar.Root>
        </Panel.Toolbar>
        <Panel.Content>
          <ScrollContainer.Root pin ref={scrollerRef}>
            <ScrollContainer.Content thin>
              <ScrollContainer.Viewport ref={setViewport}>
                <Timeline branches={branches} commits={commits} showTimestamp scroller={viewport} />
              </ScrollContainer.Viewport>
              <ScrollContainer.ScrollDownButton />
            </ScrollContainer.Content>
          </ScrollContainer.Root>
        </Panel.Content>
      </Panel.Root>
    );
  },
};

//
// Test data
//
