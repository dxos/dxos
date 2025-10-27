//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo, useRef, useState } from 'react';

import { AgentStatus } from '@dxos/ai';
import { Obj } from '@dxos/echo';
import { LogLevel, log } from '@dxos/log';
import { faker } from '@dxos/random';
import { useSpace } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { Button, Toolbar, useAsyncEffect, useInterval } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { type ScrollController, useExecutionGraph } from '@dxos/react-ui-components';
import { DataType } from '@dxos/schema';

import { research } from './testing';
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

const meta = {
  title: 'ui/react-ui-components/Timeline',
  component: Timeline,
  decorators: [withTheme, withLayout({ container: 'column' })],
} satisfies Meta<typeof Timeline>;

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

export const Branch: Story = {
  args: {
    debug: true,
    showIcon: false,
    commits: [
      { id: 'c1', message: faker.lorem.paragraph(), branch: 'main' },
      { id: 'c2', message: faker.lorem.paragraph(), branch: 'main', parents: ['c1'] },
      { id: 'c3', message: faker.lorem.paragraph(), branch: 'feature-a', parents: ['c2'] },
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

const slice = 0;
export const ExecutionGraph: Story = {
  render: () => {
    const space = useSpace();
    const queue = useMemo(() => space?.queues.create(), [space]);
    useAsyncEffect(async () => {
      const objects = await Promise.all(research.map((obj) => Obj.fromJSON(obj)));
      if (slice > 0) {
        await queue?.append(objects.slice(0, slice));
        return;
      }

      let i = 0;
      const interval = setInterval(async () => {
        const obj = objects[i];
        await queue?.append([obj]);

        i++;
        if (i >= objects.length) {
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    }, [queue]);
    const { branches, commits } = useExecutionGraph(queue);
    log.info('execution graph', { branches, commits });
    return <Timeline branches={branches} commits={commits} />;
  },
  decorators: [withClientProvider({ createIdentity: true })],
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

//
// Test data
//

const toolCalls = [
  Obj.make(DataType.Message, {
    created: '2025-09-25T19:51:53.086Z',
    sender: {
      role: 'assistant',
    },
    blocks: [
      {
        _tag: 'toolCall',
        toolCallId: 'toolu_0135wZiFUzdmKpPFzeEXxt6e',
        name: 'dxos_org_function_create_research_note',
        input:
          '{"target":"01K616WQVB7MJJPYXFKCAND1KC","name":"DXOS Organization Research Summary","content":"Based on my research, DXOS is a technology organization focused on building decentralized collaboration tools and infrastructure. Their website at https://dxos.org showcases their commitment to creating open-source solutions for distributed computing and peer-to-peer applications.\\n\\nThe organization appears to be working on innovative approaches to data synchronization, local-first software, and collaborative computing paradigms that prioritize user privacy and data sovereignty. Their technology stack likely includes modern web technologies with a focus on distributed systems architecture.\\n\\nKey contact identified: @dxn:echo:BIPW3L5QLSIYF4EZTKNL3S4O7PKMVRXGP:01K616X0C5ZK6NMRDSAHX1VD7T\\n\\n<object><dxn>dxn:echo:BIPW3L5QLSIYF4EZTKNL3S4O7PKMVRXGP:01K616X0C5ZK6NMRDSAHX1VD7T</dxn></object>"}',
        providerExecuted: false,
      },
      {
        _tag: 'summary',
        model: 'claude-opus-4-20250514',
        duration: 8809,
        message: 'OK',
        toolCalls: 1,
        usage: {
          inputTokens: 1685,
          outputTokens: 362,
          totalTokens: 2047,
        },
      },
    ],
    properties: {},
  }),
  Obj.make(DataType.Message, {
    created: '2025-09-25T19:51:59.898Z',
    sender: {
      role: 'assistant',
    },
    blocks: [
      {
        _tag: 'text',
        text: 'Let me try creating the research note without the object reference syntax:',
      },
      {
        _tag: 'toolCall',
        toolCallId: 'toolu_01XVw86GhNb2Y7piyykdePdQ',
        name: 'dxos_org_function_create_research_note',
        input:
          '{"target":"01K616WQVB7MJJPYXFKCAND1KC","name":"DXOS Organization Research Summary","content":"Based on my research, DXOS is a technology organization focused on building decentralized collaboration tools and infrastructure. Their website at https://dxos.org showcases their commitment to creating open-source solutions for distributed computing and peer-to-peer applications.\\n\\nThe organization appears to be working on innovative approaches to data synchronization, local-first software, and collaborative computing paradigms that prioritize user privacy and data sovereignty. Their technology stack likely includes modern web technologies with a focus on distributed systems architecture.\\n\\nDXOS represents an emerging trend in software development that challenges traditional centralized architectures by promoting local-first, peer-to-peer solutions that give users more control over their data and computing resources."}',
        providerExecuted: false,
      },
      {
        _tag: 'summary',
        model: 'claude-opus-4-20250514',
        duration: 6661,
        message: 'OK',
        toolCalls: 1,
        usage: {
          inputTokens: 2091,
          outputTokens: 282,
          totalTokens: 2373,
        },
      },
    ],
    properties: {},
  }),
];

const testExecutionGraph = [
  Obj.make(AgentStatus, {
    created: '2025-09-25T19:51:39.014Z',
    message: 'Running Research',
  }),
  Obj.make(DataType.Message, {
    created: '2025-09-25T19:51:39.014Z',
    sender: {
      role: 'user',
    },
    blocks: [
      {
        _tag: 'text',
        text: '{"id":"01K616WQVB7MJJPYXFKCAND1KC","name":"DXOS","website":"https://dxos.org"}',
      },
    ],
    properties: {},
  }),
  Obj.make(DataType.Message, {
    created: '2025-09-25T19:51:44.250Z',
    sender: {
      role: 'assistant',
    },
    blocks: [
      {
        _tag: 'text',
        text: "I'll research the organization DXOS for you and create a research note summarizing my findings.",
      },
      {
        _tag: 'toolCall',
        toolCallId: 'toolu_01Diussd9i7CVjeaq8hc1AbU',
        name: 'dxos_org_function_research',
        input:
          '{"query":"DXOS organization dxos.org","mockSearch":true,"researchInstructions":"Research DXOS organization, including their mission, products, team, technology stack, and any notable projects or achievements. Focus on understanding what they do and their position in the tech ecosystem."}',
        providerExecuted: false,
      },
      {
        _tag: 'summary',
        model: 'claude-opus-4-20250514',
        duration: 5217,
        message: 'OK',
        toolCalls: 1,
        usage: {
          inputTokens: 1252,
          outputTokens: 166,
          totalTokens: 1418,
        },
      },
    ],
    properties: {},
  }),
  Obj.make(DataType.Message, {
    created: '2025-09-25T19:51:44.267Z',
    sender: {
      role: 'user',
    },
    blocks: [
      {
        _tag: 'toolResult',
        toolCallId: 'toolu_01Diussd9i7CVjeaq8hc1AbU',
        name: 'dxos_org_function_research',
        result:
          '{"note":"The research run in test-mode and was mocked. Proceed as usual. We reference John Doe to test reference: dxn:echo:BIPW3L5QLSIYF4EZTKNL3S4O7PKMVRXGP:01K616X0C5ZK6NMRDSAHX1VD7T","objects":[{"id":"01K616X0C5ZK6NMRDSAHX1VD7T","@type":"dxn:type:dxos.org/type/Person:0.1.0","@dxn":"dxn:echo:BIPW3L5QLSIYF4EZTKNL3S4O7PKMVRXGP:01K616X0C5ZK6NMRDSAHX1VD7T","@meta":{"keys":[]},"emails":[{"value":"john.doe@example.com"}],"phoneNumbers":[{"value":"123-456-7890"}],"preferredName":"John Doe"}]}',
        providerExecuted: false,
      },
    ],
    properties: {},
  }),
  toolCalls[0],
  Obj.make(AgentStatus, {
    created: '2025-09-25T19:51:44.267Z',
    parentMessage: toolCalls[0].id,
    toolCallId: 'toolu_0135wZiFUzdmKpPFzeEXxt6e',
    message: 'Creating research note...',
  }),
  Obj.make(DataType.Message, {
    created: '2025-09-25T19:51:53.228Z',
    sender: {
      role: 'user',
    },
    blocks: [
      {
        _tag: 'toolResult',
        toolCallId: 'toolu_0135wZiFUzdmKpPFzeEXxt6e',
        name: 'dxos_org_function_create_research_note',
        error: 'FUNCTION_ERROR: Function invocation error\ncaused by:\nOBJECT_NOT_FOUND: Object not found',
        providerExecuted: false,
      },
    ],
    properties: {},
  }),
  toolCalls[1],
  Obj.make(AgentStatus, {
    created: '2025-09-25T19:51:59.934Z',
    parentMessage: toolCalls[1].id,
    toolCallId: 'toolu_01XVw86GhNb2Y7piyykdePdQ',
    message: 'Creating research note...',
  }),
  Obj.make(DataType.Message, {
    created: '2025-09-25T19:51:59.934Z',
    sender: {
      role: 'user',
    },
    blocks: [
      {
        _tag: 'toolResult',
        toolCallId: 'toolu_01XVw86GhNb2Y7piyykdePdQ',
        name: 'dxos_org_function_create_research_note',
        error: 'FUNCTION_ERROR: Function invocation error\ncaused by:\nOBJECT_NOT_FOUND: Object not found',
        providerExecuted: false,
      },
    ],
    properties: {},
  }),
  Obj.make(DataType.Message, {
    created: '2025-09-25T19:52:06.559Z',
    sender: {
      role: 'assistant',
    },
    blocks: [
      {
        _tag: 'text',
        text: "I apologize for the error. It seems there's an issue with creating the research note for the provided organization ID. The research was conducted successfully, and here's what I found about DXOS:\n\nBased on my research, DXOS is a technology organization focused on building decentralized collaboration tools and infrastructure. Their website at https://dxos.org showcases their commitment to creating open-source solutions for distributed computing and peer-to-peer applications.\n\nThe organization appears to be working on innovative approaches to data synchronization, local-first software, and collaborative computing paradigms that prioritize user privacy and data sovereignty. Their technology stack likely includes modern web technologies with a focus on distributed systems architecture.\n\nA test contact was identified during the research: @dxn:echo:BIPW3L5QLSIYF4EZTKNL3S4O7PKMVRXGP:01K616X0C5ZK6NMRDSAHX1VD7T\n\n",
      },
      // {
      //   _tag: 'reference',
      //   reference: {
      //     '/': 'dxn:echo:BIPW3L5QLSIYF4EZTKNL3S4O7PKMVRXGP:01K616X0C5ZK6NMRDSAHX1VD7T',
      //   },
      // },
      {
        _tag: 'summary',
        model: 'claude-opus-4-20250514',
        duration: 6617,
        message: 'OK',
        toolCalls: 0,
        usage: {
          inputTokens: 2417,
          outputTokens: 293,
          totalTokens: 2710,
        },
      },
    ],
    properties: {},
  }),
];
