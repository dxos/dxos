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
import * as Tag from '@dxos/react-ui/Tag';
import { Message } from '@dxos/types';

import type { PermissionAgent } from '../modules/PermissionContext.tsx';
import { PERMISSION_OPTIONS } from '../testing/index.ts';

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

type Line =
  | { kind: 'prompt'; id: string; text: string }
  | { kind: 'answer'; id: string; text: string }
  | { kind: 'call'; id: string; name: string; input: string }
  | { kind: 'result'; id: string; name: string; text: string; refused: boolean; failed: boolean };

const toLines = (messages: readonly Message.Message[]): Line[] =>
  messages.flatMap((message) =>
    message.blocks.flatMap((block, index): Line[] => {
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

const TranscriptLine = ({ line }: { line: Line }) => {
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

export type PermissionAgentTileProps = {
  agent: PermissionAgent;
  db?: Database.Database;
  processTreeAtom?: Atom.Atom<readonly Process.Process[]>;
  onRemove?: (id: string) => void;
};

/**
 * A spawned agent: the grants its process holds, its live transcript, and the tool processes it
 * spawned, where a refusal shows as a FAILED process carrying the guard's denial.
 */
export const PermissionAgentTile = ({ agent, db, processTreeAtom, onRemove }: PermissionAgentTileProps) => {
  const feed = agent.session?.feed;
  const conversation = feed ? Obj.getURI(feed) : undefined;
  const { agent: agentProcess, tools } = useConversationProcesses({ processTreeAtom, conversation });
  const messages = useQuery(
    db,
    feed ? Query.select(Filter.type(Message.Message)).from(feed) : Query.select(Filter.nothing()),
  );
  const lines = useMemo(() => toLines(messages), [messages]);
  const refusals = tools.flatMap((process) => {
    const reason = process.state === Process.State.FAILED ? refusalOf(process.error?.message) : undefined;
    return reason ? [{ pid: process.pid, key: process.key, reason }] : [];
  });

  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [lines.length]);

  const state = agentProcess?.state;
  const terminal = state !== undefined && Process.isTerminal(state);
  return (
    <Card.Root grid data-testid='permission-agent'>
      <Card.Header>
        <Icon.Icon icon={agent.location.kind === 'edge' ? 'ph--cloud--regular' : 'ph--laptop--regular'} />
        <Card.Title truncate>
          Agent {agent.index} · {agent.location.kind}
        </Card.Title>
        {(terminal || agent.error) && <Card.Action system='delete' onClick={() => onRemove?.(agent.id)} />}
      </Card.Header>
      <Card.Row icon='ph--key--regular' data-testid='permission-agent-grants'>
        <div className='flex flex-wrap gap-1'>
          {PERMISSION_OPTIONS.map(({ id, label }) =>
            agent.config.permissions.includes(id) ? (
              <Tag.Tag key={id} hue='success'>
                {label}
              </Tag.Tag>
            ) : (
              <Tag.Tag key={id} hue='neutral' classNames='line-through opacity-60'>
                {label}
              </Tag.Tag>
            ),
          )}
        </div>
      </Card.Row>
      {agent.location.kind === 'edge' && (
        <Card.Row icon='ph--warning--regular' data-testid='permission-agent-unguarded'>
          <span className='text-sm text-warning-text whitespace-normal'>
            No guard on EDGE: these grants are not enforced.
          </span>
        </Card.Row>
      )}
      <Card.Row icon='ph--cpu--regular' data-testid='permission-agent-state'>
        <div className='flex items-center gap-2 min-w-0'>
          <span className='font-mono truncate'>{agentProcess?.pid ?? (agent.error ? 'not spawned' : 'spawning…')}</span>
          {state && <Tag.Tag hue={STATE_HUE[state]}>{state}</Tag.Tag>}
        </div>
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
          {agent.error && (
            <pre className='text-error-text text-xs whitespace-pre-wrap' data-testid='permission-agent-error'>
              {agent.error}
            </pre>
          )}
        </div>
      </Card.Row>
      {tools.length > 0 && (
        <Card.Row span='full'>
          <div className='flex flex-col gap-1 w-full text-sm' data-testid='permission-agent-tools'>
            {tools.map((process) => (
              <div key={process.pid} className='flex items-center gap-2 min-w-0' data-testid='permission-tool-process'>
                <Icon.Icon icon='ph--git-branch--regular' classNames='shrink-0' />
                <span className='font-mono truncate'>{shortName(process.key)}</span>
                <Tag.Tag hue={STATE_HUE[process.state]}>{process.state}</Tag.Tag>
              </div>
            ))}
          </div>
        </Card.Row>
      )}
      {refusals.length > 0 && (
        <Card.Row icon='ph--shield-warning--regular' data-testid='permission-agent-refusals'>
          <div className='flex flex-col gap-1 text-sm text-error-text whitespace-normal [overflow-wrap:anywhere]'>
            {refusals.map(({ pid, key, reason }) => (
              <span key={pid}>
                {shortName(key)} refused: {reason.replace(/^denied: /, '')}
              </span>
            ))}
          </div>
        </Card.Row>
      )}
    </Card.Root>
  );
};
