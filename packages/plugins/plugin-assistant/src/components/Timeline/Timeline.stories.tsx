//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useRef, useState } from 'react';

import { LogLevel } from '@dxos/log';
import { faker } from '@dxos/random';
import { Button, Toolbar, useInterval } from '@dxos/react-ui';
import { ScrollContainer, type ScrollController } from '@dxos/react-ui-components';
import { ColumnContainer, withLayout, withTheme } from '@dxos/storybook-utils';

import { type Branch, type Commit, IconType, Timeline } from './Timeline';

faker.seed(1);

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
    branches: [{ name: 'main' }, { name: 'feature-a' }, { name: 'feature-b' }, { name: 'feature-c' }],
    commits: [
      { id: 'c1', message: faker.lorem.paragraph(), branch: 'main' },
      { id: 'c2', message: faker.lorem.paragraph(), branch: 'main', parent: 'c1' },
      { id: 'c3', message: faker.lorem.paragraph(), branch: 'feature-a', parent: 'c2' },
      { id: 'c4', message: faker.lorem.paragraph(), branch: 'main', parent: 'c2' },
      { id: 'c5', message: faker.lorem.paragraph(), branch: 'feature-b', parent: 'c2' },
      { id: 'c6', message: faker.lorem.paragraph(), branch: 'feature-a', parent: 'c3' },
      { id: 'c7', message: faker.lorem.paragraph(), branch: 'feature-a', parent: 'c6' },
      { id: 'c8', message: faker.lorem.paragraph(), branch: 'feature-c', parent: 'c6' },
      { id: 'c9', message: faker.lorem.paragraph(), branch: 'main', parent: 'c4' },
    ],
  },
};

export const Simple: Story = {
  args: {
    branches: [{ name: 'main' }, { name: 'feature-a' }],
    commits: [
      { id: 'c1', message: faker.lorem.paragraph(), branch: 'main' },
      { id: 'c2', message: faker.lorem.paragraph(), branch: 'feature-a', parent: 'c1' },
      { id: 'c3', message: faker.lorem.paragraph(), branch: 'feature-a', parent: 'c2' },
      { id: 'c4', message: faker.lorem.paragraph(), branch: 'main', parent: 'c1' },
    ],
  },
};

export const Linear: Story = {
  args: {
    branches: [{ name: 'main' }],
    commits: [
      { id: 'c1', message: faker.lorem.paragraph(), branch: 'main' },
      { id: 'c2', message: faker.lorem.paragraph(), branch: 'main', parent: 'c1' },
      { id: 'c3', message: faker.lorem.paragraph(), branch: 'main', parent: 'c2' },
      { id: 'c4', message: faker.lorem.paragraph(), branch: 'main', parent: 'c3' },
    ],
  },
};

export const Empty: Story = {
  args: {
    branches: [],
    commits: [],
  },
};

export const Random: Story = {
  render: () => {
    const [branches, setBranches] = useState<Branch[]>([{ name: 'main' }]);
    const [commits, setCommits] = useState<Commit[]>([
      {
        id: faker.string.uuid(),
        branch: branches[0].name,
        message: faker.lorem.paragraph(),
      },
    ]);
    const lastCommit = useRef<string | undefined>(commits[0].id);
    const lastBranch = useRef<string>(branches[0].name);

    const [running, setRunning] = useState(true);
    useInterval(
      () => {
        if (!running) {
          return;
        }

        let commit: Commit | undefined = undefined;
        const p = Math.random();
        if (p < 0.15 && branches.length < 6) {
          const branch = { name: faker.lorem.word() } satisfies Branch;
          setBranches((branches) => [...branches, branch]);
          lastBranch.current = branch.name;
        } else if (p < 0.4) {
          const branch = branches[Math.floor(Math.random() * branches.length)];
          lastBranch.current = branch.name;
        } else if (p < 0.5 && branches.length > 3 && lastCommit.current && lastBranch.current !== branches[0].name) {
          commit = {
            id: faker.string.uuid(),
            branch: branches[0].name,
            icon: IconType.TIMER,
            level: LogLevel.INFO,
            parent: [lastCommit.current!],
          };
        }

        if (!commit) {
          commit = {
            id: faker.string.uuid(),
            branch: lastBranch.current,
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
            parent: lastCommit.current,
          };
        }

        lastCommit.current = commit.id;
        setCommits((commits) => [...commits, commit]);
      },
      500,
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
        <ScrollContainer ref={scrollerRef}>
          <Timeline branches={branches} commits={commits} />
        </ScrollContainer>
      </div>
    );
  },
};
