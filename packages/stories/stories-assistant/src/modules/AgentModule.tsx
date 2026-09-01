//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Client } from '@dxos/agent-claude/client';
import { Icon, IconButton, Input, Panel } from '@dxos/react-ui';
import { ContentBlock } from '@dxos/types';
import { mx } from '@dxos/ui-theme';

type Turn = {
  role: 'user' | 'assistant' | 'tool';
  blocks: readonly ContentBlock.Any[];
};

const blockText = (block: ContentBlock.Any): string => {
  switch (block._tag) {
    case 'text':
      return block.text;
    case 'reasoning':
      return block.reasoningText ?? '';
    case 'toolCall':
      return `→ ${block.name}(${block.input.slice(0, 120)})`;
    case 'toolResult':
      return block.error ? `✗ ${block.name}: ${block.error}` : `✓ ${block.name}`;
    case 'stats':
      return `— ${block.usage?.totalTokens ?? 0} tokens · ${block.duration ?? 0}ms · ${block.finishReason ?? ''}`;
    default:
      return `[${block._tag}]`;
  }
};

/**
 * A failed tool result the agent immediately retried and got right — collapsed because the SDK's
 * `Read` wants an absolute path, so nearly every turn carries one. Scoped to the same exchange
 * (`segment`): a success in a later turn must not hide an unrelated earlier failure or a denial.
 */
const isSuperseded = (
  block: ContentBlock.Any,
  rows: readonly { block: ContentBlock.Any; segment: number }[],
  index: number,
): boolean =>
  block._tag === 'toolResult' &&
  block.error !== undefined &&
  rows
    .slice(index + 1)
    .filter((row) => row.segment === rows[index].segment)
    .some(({ block: later }) => later._tag === 'toolResult' && later.name === block.name && later.error === undefined);

/** Colour by kind so a denied tool call is obvious without reading it. */
const blockClass = (block: ContentBlock.Any): string => {
  switch (block._tag) {
    case 'toolResult':
      return block.error ? 'text-errorText' : 'text-successText';
    case 'toolCall':
      return 'text-subdued';
    case 'reasoning':
    case 'stats':
      return 'text-description text-xs';
    default:
      return '';
  }
};

/**
 * A prompt box wired straight to the Claude Agent SDK host.
 *
 * Renders the projected `ContentBlock`s directly rather than through the assistant's Chat surface,
 * which reads a processor's in-memory state and so cannot show an externally produced turn. Needs
 * the host mounted in the dev server — see `DX_AGENT_CWD` in `.storybook/main.ts`.
 */
export const AgentModule = () => {
  const [prompt, setPrompt] = useState('Read agent-fixture.md and tell me the MAGIC_TOKEN.');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [session, setSession] = useState<string>();
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string>();
  const scroller = useRef<HTMLDivElement>(null);

  // Stick to the newest turn as blocks stream in; a transcript that has to be scrolled by hand
  // hides the answer behind the tool calls that produced it.
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [turns, running]);

  const rows = useMemo(() => {
    // Segments delimit one user prompt and the exchange it produced; supersede-collapsing must not
    // cross them.
    let segment = 0;
    const flat = turns.flatMap((turn) => {
      if (turn.role === 'user') {
        segment += 1;
      }
      return turn.blocks.map((block) => ({ role: turn.role, block, segment }));
    });
    let previousRole: string | undefined;
    return (
      flat
        // A reasoning block with no text rendered as a bare role header with nothing under it.
        .filter(({ block }) => blockText(block).trim().length > 0)
        .map(({ role, block }, index, filtered) => {
          const label = role === previousRole ? undefined : role;
          previousRole = role;
          return { role: label, block, superseded: isSuperseded(block, filtered, index) };
        })
    );
  }, [turns]);

  const send = useCallback(
    async (fork = false) => {
      if (!prompt.trim() || running) {
        return;
      }

      setRunning(true);
      setError(undefined);
      setTurns((turns) => [...turns, { role: 'user', blocks: [{ _tag: 'text', text: prompt }] }]);
      const sent = prompt;
      setPrompt('');

      try {
        for await (const frame of Client.run({ prompt: sent, maxTurns: 8, resume: session, fork })) {
          if (Client.isEnd(frame)) {
            setSession(frame.sessionId);
            setError(frame.error);
          } else {
            setTurns((turns) => [...turns, { role: frame.role, blocks: frame.blocks }]);
          }
        }
      } catch (err) {
        setError(String(err));
      } finally {
        setRunning(false);
      }
    },
    [prompt, running, session],
  );

  return (
    <Panel.Root classNames='dx-fill flex flex-col gap-2 p-2 overflow-hidden'>
      <Panel.Toolbar classNames='shrink-0 justify-end'>
        <div className='flex items-center gap-1 text-xs text-description'>
          <Icon icon='ph--git-commit--regular' size={4} />
          {session ? `session ${session.slice(0, 8)}` : 'no session'}
        </div>
      </Panel.Toolbar>

      <div ref={scroller} className='dx-grow overflow-y-auto p-2'>
        <div className='flex flex-col gap-3'>
          {rows.map(({ role, block, superseded }, index) => (
            <div key={index} className='flex flex-col gap-1'>
              {role && <div className='text-xs text-description uppercase'>{role}</div>}
              <div
                className={mx(
                  'whitespace-pre-wrap text-sm',
                  superseded ? 'text-description text-xs' : blockClass(block),
                )}
              >
                {superseded ? `✗ ${block._tag === 'toolResult' ? block.name : ''} (retried)` : blockText(block)}
              </div>
            </div>
          ))}
          {running && <div className='text-sm text-description'>running…</div>}
          {error && <div className='text-sm text-errorText'>{error}</div>}
        </div>
      </div>

      <div className='flex gap-2 items-center shrink-0'>
        <Input.Root>
          <Input.TextInput
            classNames='flex-1 min-w-0'
            placeholder='Ask the agent…'
            value={prompt}
            disabled={running}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void send();
              }
            }}
          />
        </Input.Root>
        <IconButton
          classNames='shrink-0'
          icon='ph--paper-plane-right--regular'
          label='Send'
          disabled={running}
          onClick={() => void send()}
        />
        <IconButton
          classNames='shrink-0'
          icon='ph--git-branch--regular'
          label='Fork'
          disabled={running || !session}
          onClick={() => void send(true)}
        />
      </div>
    </Panel.Root>
  );
};
