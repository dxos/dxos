//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import React, { useEffect, useMemo, useRef } from 'react';

import { AGENT_PROCESS_KEY } from '@dxos/agent-runtime';
import * as Process from '@dxos/compute/Process';
import { type Database, Filter, Obj, Query } from '@dxos/echo';
import { useQuery } from '@dxos/react-client/echo';
import * as Card from '@dxos/react-ui/Card';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as Tag from '@dxos/react-ui/Tag';
import { Message } from '@dxos/types';

import type { PermissionAgent } from '../modules/PermissionContext.tsx';
import { PERMISSION_OPTIONS, type PermissionId } from '../testing/index.ts';

const EMPTY_TREE = Atom.make<readonly Process.Process[]>([]);

const STATE_HUE: Record<Process.State, 'neutral' | 'sky' | 'success' | 'error' | 'warning'> = {
  [Process.State.STARTING]: 'neutral',
  [Process.State.RUNNING]: 'sky',
  [Process.State.TERMINATING]: 'warning',
  [Process.State.HYBERNATING]: 'sky',
  [Process.State.IDLE]: 'neutral',
  [Process.State.SUCCEEDED]: 'success',
  [Process.State.FAILED]: 'error',
  [Process.State.TERMINATED]: 'warning',
};

/** The tool name a model sees for an operation key, which is what the transcript names. */
const shortName = (key: string): string => key.split('.').at(-1) ?? key;

const REFUSAL = /(denied: .+?|requires permissions and the invoking process holds none)(?:: \{.*)?$/s;

/** The guard's reason, without the error name, operation key and context it is wrapped in; undefined for other errors. */
const refusalOf = (message: string | undefined): string | undefined =>
  message ? REFUSAL.exec(message)?.[1] : undefined;

type ProcessesProps = {
  processTreeAtom?: Atom.Atom<readonly Process.Process[]>;
  conversation?: string;
};

/** The agent's process and the tool calls it spawned, which share its conversation. */
const useConversationProcesses = ({ processTreeAtom, conversation }: ProcessesProps) => {
  const tree = useAtomValue(processTreeAtom ?? EMPTY_TREE);
  return useMemo(() => {
    const processes = conversation ? tree.filter((process) => process.environment.conversation === conversation) : [];
    const agent = processes.find((process) => process.key === AGENT_PROCESS_KEY);
    const tools = processes.filter((process) => process.key !== AGENT_PROCESS_KEY);
    return { agent, tools };
  }, [tree, conversation]);
};

/** One line of an agent's transcript as its card shows it. */
export type PermissionLine =
  | { kind: 'prompt'; id: string; text: string }
  | { kind: 'answer'; id: string; text: string }
  | { kind: 'call'; id: string; name: string; input: string }
  | { kind: 'result'; id: string; name: string; text: string; refused: boolean; failed: boolean };

const toLines = (messages: readonly Message.Message[]): PermissionLine[] =>
  messages.flatMap((message) =>
    message.blocks.flatMap((block, index): PermissionLine[] => {
      const id = `${message.id}-${index}`;
      switch (block._tag) {
        case 'text':
          return block.text.trim()
            ? [{ kind: message.sender.role === 'user' ? 'prompt' : 'answer', id, text: block.text }]
            : [];
        case 'toolCall':
          return [{ kind: 'call', id, name: block.operationName ?? block.name, input: block.input }];
        case 'toolResult': {
          const text =
            refusalOf(block.error) ??
            block.error ??
            (typeof block.result === 'string' ? block.result : JSON.stringify(block.result));
          return [
            {
              kind: 'result',
              id,
              name: block.name,
              text: text ?? '',
              refused: refusalOf(block.error) !== undefined,
              failed: block.error !== undefined,
            },
          ];
        }
        default:
          return [];
      }
    }),
  );

const TranscriptLine = ({ line }: { line: PermissionLine }) => {
  switch (line.kind) {
    case 'prompt':
      return (
        <div className='self-end max-w-[85%] px-2 py-1 rounded-sm bg-group-surface' data-testid='transcript-prompt'>
          {line.text}
        </div>
      );
    case 'answer':
      return (
        <div className='flex gap-1' data-testid='transcript-answer'>
          <Icon.Icon icon='ph--sparkle--regular' classNames='text-accent-text mt-0.5 shrink-0' />
          <span>{line.text}</span>
        </div>
      );
    case 'call':
      return (
        <div className='flex items-center gap-1 min-w-0' data-testid='transcript-tool-call'>
          <Icon.Icon icon='ph--wrench--regular' classNames='shrink-0' />
          <Tag.Tag hue='sky' classNames='font-mono shrink-0'>
            {line.name}
          </Tag.Tag>
          <span className='font-mono text-fg-muted truncate'>{line.input}</span>
        </div>
      );
    case 'result':
      return (
        <div
          className={`flex gap-1 ps-5 min-w-0 font-mono ${line.failed ? 'text-error-text' : 'text-fg-muted'}`}
          data-testid={line.refused ? 'transcript-refused' : 'transcript-tool-result'}
        >
          <Icon.Icon
            icon={line.refused ? 'ph--lock-simple--bold' : 'ph--arrow-elbow-down-right--regular'}
            classNames='mt-0.5 shrink-0'
          />
          <span className={line.refused ? undefined : 'truncate'}>{line.text}</span>
        </div>
      );
  }
};

/** A tool process the agent spawned, as its card lists it. */
export type PermissionToolProcess = {
  pid: string;
  key: string;
  state: Process.State;
  /** The guard's denial, when the process failed because of one. */
  refusal?: string;
};

export type PermissionAgentCardProps = {
  index: number;
  location: Process.Location['kind'];
  /** The permission ids the agent's guard holds. */
  granted: readonly PermissionId[];
  /** The agent's own process, once spawned. */
  pid?: string;
  state?: Process.State;
  /** Why the agent could not be spawned. */
  error?: string;
  lines: readonly PermissionLine[];
  tools: readonly PermissionToolProcess[];
  onRemove?: () => void;
};

/**
 * An agent's card from plain values: the grants its process holds, its transcript, and the tool processes it
 * spawned, each with its state at the row's end, where a refusal shows as a FAILED process and the guard's denial.
 */
export const PermissionAgentCard = ({
  index,
  location,
  granted,
  pid,
  state,
  error,
  lines,
  tools,
  onRemove,
}: PermissionAgentCardProps) => {
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [lines.length]);

  const terminal = state !== undefined && Process.isTerminal(state);
  const refusals = tools.filter((tool) => tool.refusal !== undefined);
  return (
    <Card.Root grid data-testid='permission-agent'>
      <Card.Header>
        <Layout.Block rail='start'>
          <Icon.Icon icon={location === 'edge' ? 'ph--cloud--regular' : 'ph--laptop--regular'} />
        </Layout.Block>
        <Card.Title truncate>
          Agent {index} · {location}
        </Card.Title>
        {(terminal || error) && <Card.Action system='delete' onClick={onRemove} />}
      </Card.Header>
      <Card.Row icon='ph--key--regular' data-testid='permission-agent-grants'>
        <Layout.Flex wrap gap='xs'>
          {PERMISSION_OPTIONS.map(({ id, label }) =>
            granted.includes(id) ? (
              <Tag.Tag key={id} hue='success'>
                {label}
              </Tag.Tag>
            ) : (
              <Tag.Tag key={id} hue='neutral' classNames='line-through opacity-60'>
                {label}
              </Tag.Tag>
            ),
          )}
        </Layout.Flex>
      </Card.Row>
      {location === 'edge' && (
        <Card.Row icon='ph--warning--regular' data-testid='permission-agent-unguarded'>
          <Card.Text lines={2} classNames='text-warning-text'>
            No guard on EDGE: these grants are not enforced.
          </Card.Text>
        </Card.Row>
      )}
      <Card.Row
        icon='ph--cpu--regular'
        trailing={state ? <Tag.Tag hue={STATE_HUE[state]}>{state}</Tag.Tag> : undefined}
        data-testid='permission-agent-state'
      >
        <Card.Text truncate classNames='font-mono'>
          {pid ?? (error ? 'not spawned' : 'spawning…')}
        </Card.Text>
      </Card.Row>
      <Card.Row span='full'>
        <div
          ref={scroller}
          className='flex flex-col gap-1.5 w-full h-56 overflow-y-auto p-2 rounded-sm border border-separator text-sm whitespace-normal [overflow-wrap:anywhere]'
          data-testid='permission-agent-transcript'
        >
          {lines.map((line) => (
            <TranscriptLine key={line.id} line={line} />
          ))}
          {error && (
            <pre className='text-error-text text-xs whitespace-pre-wrap' data-testid='permission-agent-error'>
              {error}
            </pre>
          )}
        </div>
      </Card.Row>
      {tools.length > 0 && (
        <Card.Section title='Tool processes' data-testid='permission-agent-tools'>
          {tools.map((tool) => (
            <Card.Row
              key={tool.pid}
              icon='ph--git-branch--regular'
              trailing={<Tag.Tag hue={STATE_HUE[tool.state]}>{tool.state}</Tag.Tag>}
              data-testid='permission-tool-process'
            >
              <Card.Text truncate classNames='font-mono'>
                {shortName(tool.key)}
              </Card.Text>
            </Card.Row>
          ))}
        </Card.Section>
      )}
      {refusals.length > 0 && (
        <Card.Section title='Refused' data-testid='permission-agent-refusals'>
          {refusals.map((tool) => (
            <Card.Row key={tool.pid} icon='ph--shield-warning--regular'>
              <Card.Text lines={3} classNames='text-error-text [overflow-wrap:anywhere]'>
                {shortName(tool.key)}: {tool.refusal?.replace(/^denied: /, '')}
              </Card.Text>
            </Card.Row>
          ))}
        </Card.Section>
      )}
    </Card.Root>
  );
};

export type PermissionAgentTileProps = {
  agent: PermissionAgent;
  db?: Database.Database;
  processTreeAtom?: Atom.Atom<readonly Process.Process[]>;
  onRemove?: (id: string) => void;
};

/** A spawned agent's card, following its feed and the process tree. */
export const PermissionAgentTile = ({ agent, db, processTreeAtom, onRemove }: PermissionAgentTileProps) => {
  const feed = agent.session?.feed;
  const conversation = feed ? Obj.getURI(feed) : undefined;
  const { agent: agentProcess, tools } = useConversationProcesses({ processTreeAtom, conversation });
  const messages = useQuery(
    db,
    feed ? Query.select(Filter.type(Message.Message)).from(feed) : Query.select(Filter.nothing()),
  );
  const lines = useMemo(() => toLines(messages), [messages]);
  const toolProcesses = useMemo(
    () =>
      tools.map(({ pid, key, state, error }) => ({
        pid,
        key,
        state,
        refusal: state === Process.State.FAILED ? refusalOf(error?.message) : undefined,
      })),
    [tools],
  );

  return (
    <PermissionAgentCard
      index={agent.index}
      location={agent.location.kind}
      granted={agent.config.permissions}
      pid={agentProcess?.pid}
      state={agentProcess?.state}
      error={agent.error}
      lines={lines}
      tools={toolProcesses}
      onRemove={() => onRemove?.(agent.id)}
    />
  );
};
